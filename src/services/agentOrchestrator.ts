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

  public enqueueAction(toolName: string, args: any): Promise<boolean> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    const action: QueuedAction = {
      id,
      toolName,
      args,
      state: 'pending'
    };
    
    this.queue.push(action);
    this.notify();

    return new Promise((resolve, reject) => {
      this.resolvers.set(id, { resolve, reject });
    });
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
