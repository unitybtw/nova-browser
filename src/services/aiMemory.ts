export class AIMemoryService {
  private memory: string[] = [];

  addMemory(fact: string) {
    this.memory.push(fact);
  }

  getMemories(): string[] {
    return this.memory;
  }
}

export const aiMemory = new AIMemoryService();
