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

class AgentOrchestrator {
  /** Maximum number of terminal-state (completed/failed/denied) actions kept in the queue */
  private static readonly MAX_TERMINAL_ACTIONS = 50;

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

  public enqueueAction(toolName: string, args: any): Promise<boolean> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    const action: QueuedAction = {
      id,
      toolName,
      args,
      state: 'executing' // Automatically skip pending state
    };
    
    this.queue.push(action);
    this.pruneTerminalActions();
    this.notify();

    // Auto-approve the action immediately
    return Promise.resolve(true);
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
    this.queue = [];
    this.resolvers.clear();
    this.notify();
  }

  public getQueue() {
    return this.queue;
  }
}

export const orchestrator = new AgentOrchestrator();
