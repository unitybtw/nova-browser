export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIAgentService {
  async processQuery(prompt: string): Promise<string> {
    return `AI Assistant response for: "${prompt}"`;
  }
}

export const aiAgent = new AIAgentService();
