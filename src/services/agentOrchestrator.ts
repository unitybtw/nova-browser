type ActionState = 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'failed';

export interface QueuedAction {
  id: string;
  toolName: string;
  args: any;
  state: ActionState;
  result?: any;
  error?: string;
}

type Subscriber = (actions: QueuedAction[]) => void;

// 🔒 Security: Tools that only READ state (page text, URLs, tab lists,
// history) may auto-execute. Every other tool call is queued as 'pending' and
// waits for an explicit user decision via approveAction()/denyAction() before
// it runs. Keep this list strictly read-only — never add mutating tools here.
const READ_ONLY_TOOLS = new Set([
  'read_page_content',
  'get_page_url',
  'get_page_links',
  'get_all_tabs',
  'search_history'
]);

class AgentOrchestrator {
  /** Maximum number of terminal-state (completed/failed/denied) actions kept in the queue */
  private static readonly MAX_TERMINAL_ACTIONS = 50;
  /** How long a pending approval may wait before it is auto-denied (5 min) */
  private static readonly PENDING_TIMEOUT_MS = 5 * 60 * 1000;

  private queue: QueuedAction[] = [];
  private subscribers: Set<Subscriber> = new Set();
  
  // Pending promises for tool execution waiting on user approval
  private resolvers: Map<string, { resolve: (val: boolean) => void, reject: (err: any) => void }> = new Map();

  public subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback(this.queue);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(cb => cb([...this.queue]));
  }

  private isTerminalState(state: ActionState): boolean {
    return state === 'completed' || state === 'failed' || state === 'denied';
  }

  /**
   * Keeps the queue bounded: drops the OLDEST terminal-state actions when more than
   * MAX_TERMINAL_ACTIONS have accumulated. Pending/approved/executing actions are
   * never touched, so in-flight tool calls keep working.
   */
  private pruneTerminalActions() {
    const terminalIndexes: number[] = [];
    this.queue.forEach((a, i) => {
      if (this.isTerminalState(a.state)) terminalIndexes.push(i);
    });
    const excess = terminalIndexes.length - AgentOrchestrator.MAX_TERMINAL_ACTIONS;
    if (excess > 0) {
      const toRemove = new Set(terminalIndexes.slice(0, excess));
      this.queue = this.queue.filter((_, i) => !toRemove.has(i));
    }
  }

  /**
   * Removes ONLY terminal-state actions (completed/failed/denied). Executing and
   * pending actions are preserved so their subsequent updateActionState calls
   * still land (unlike clearQueue, which wipes everything).
   */
  public pruneCompleted() {
    const before = this.queue.length;
    this.queue = this.queue.filter(a => !this.isTerminalState(a.state));
    if (this.queue.length !== before) this.notify();
  }

  /**
   * Queues a tool action and returns its queue id plus the approval promise
   * (S3). Read-only tools resolve immediately with the same shape, so callers
   * can use `id` for status emission and post-approval bookkeeping instead of
   * fragile getQueue() tail inspection.
   */
  public enqueueAction(toolName: string, args: any): { id: string; done: Promise<boolean> } {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    const action: QueuedAction = {
      id,
      toolName,
      args,
      // Read-only tools auto-execute; everything else requires user approval
      state: READ_ONLY_TOOLS.has(toolName) ? 'executing' : 'pending'
    };

    this.queue.push(action);
    this.pruneTerminalActions();
    this.notify();

    if (action.state === 'executing') {
      return { id, done: Promise.resolve(true) };
    }

    // Wait for the user's decision. approveAction(id) resolves true,
    // denyAction(id) resolves false (and marks the action 'denied').
    // Safety net: if nobody answers within PENDING_TIMEOUT_MS (e.g. the panel
    // is closed and the approval card is invisible), deny so the agent loop
    // can never hang forever.
    const done = new Promise<boolean>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (this.resolvers.has(id)) {
          this.denyAction(id);
        }
      }, AgentOrchestrator.PENDING_TIMEOUT_MS);
      this.resolvers.set(id, {
        resolve: (val) => {
          window.clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          window.clearTimeout(timer);
          reject(err);
        }
      });
    });
    return { id, done };
  }

  public approveAction(id: string) {
    const action = this.queue.find(a => a.id === id);
    if (!action || action.state !== 'pending') return;
    
    action.state = 'approved';
    this.notify();
    
    const resolver = this.resolvers.get(id);
    if (resolver) {
      resolver.resolve(true);
      this.resolvers.delete(id);
    }
  }

  public denyAction(id: string) {
    const action = this.queue.find(a => a.id === id);
    if (!action || action.state !== 'pending') return;
    
    action.state = 'denied';
    this.notify();
    
    const resolver = this.resolvers.get(id);
    if (resolver) {
      resolver.resolve(false);
      this.resolvers.delete(id);
    }
  }

  public updateActionState(id: string, state: ActionState, result?: any, error?: string) {
    const action = this.queue.find(a => a.id === id);
    if (!action) return;
    
    action.state = state;
    if (result !== undefined) action.result = result;
    if (error !== undefined) action.error = error;
    
    // Keep the queue bounded once actions reach a terminal state
    this.pruneTerminalActions();
    this.notify();
  }

  public clearQueue() {
    // Resolve any in-flight approval waits as denied so callers don't hang
    // forever when the user stops the agent while an action is pending.
    this.resolvers.forEach(({ resolve }) => resolve(false));
    this.resolvers.clear();
    this.queue = [];
    this.notify();
  }

  public getQueue() {
    return this.queue;
  }
}

export const orchestrator = new AgentOrchestrator();
