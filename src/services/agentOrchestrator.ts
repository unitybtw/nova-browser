export class AgentOrchestrator {
  async runTask(task: string) {
    console.log('Running task:', task);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
