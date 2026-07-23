export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'fact' | 'instruction';
  createdAt: number;
}

export interface TaskSummary {
  id: string;
  summary: string;
  timestamp: number;
}

const STORAGE_KEY = 'browser_ai_memory_vault_v1';
const TASK_STORAGE_KEY = 'browser_ai_task_history_v1';

class AIMemoryService {
  private memories: MemoryItem[] = [];
  private taskHistory: TaskSummary[] = [];

  constructor() {
    this.loadMemories();
    this.loadTaskHistory();
  }

  private loadMemories() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.memories = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load AI memories from localStorage', e);
    }
  }

  private loadTaskHistory() {
    try {
      const data = localStorage.getItem(TASK_STORAGE_KEY);
      if (data) {
        this.taskHistory = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load task history', e);
    }
  }

  private saveMemories() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.error('Failed to save AI memories', e);
    }
  }

  private saveTaskHistory() {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(this.taskHistory));
    } catch (e) {
      console.error('Failed to save task history', e);
    }
  }

  public getMemories(): MemoryItem[] {
    return [...this.memories];
  }

  public getTaskHistory(): TaskSummary[] {
    return [...this.taskHistory];
  }

  public addMemory(fact: string, category: 'preference' | 'fact' | 'instruction' = 'fact'): MemoryItem {
    const existing = this.memories.find(m => m.fact.toLowerCase().trim() === fact.toLowerCase().trim());
    if (existing) return existing;

    const newItem: MemoryItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fact,
      category,
      createdAt: Date.now(),
    };

    this.memories.push(newItem);
    this.saveMemories();
    return newItem;
  }

  public addTaskSummary(summary: string): TaskSummary {
    const task: TaskSummary = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      summary,
      timestamp: Date.now(),
    };
    
    this.taskHistory.unshift(task); // Add to beginning
    if (this.taskHistory.length > 50) {
      this.taskHistory.pop(); // Keep only last 50 tasks
    }
    
    this.saveTaskHistory();
    return task;
  }

  public deleteMemory(id: string): void {
    this.memories = this.memories.filter(m => m.id !== id);
    this.saveMemories();
  }

  public clearAllMemories(): void {
    this.memories = [];
    this.saveMemories();
  }

  public getFormattedMemoryPrompt(): string {
    let prompt = '';
    if (this.memories.length > 0) {
      const factsList = this.memories.map(m => `- ${m.fact}`).join('\n');
      prompt += `\n\n[USER MEMORY VAULT]\nHere are things you remember about the user from past interactions:\n${factsList}\nUse these to personalize your responses and behavior automatically.\n`;
    }
    
    if (this.taskHistory.length > 0) {
      const recentTasks = this.taskHistory.slice(0, 3).map(t => `- ${t.summary}`).join('\n');
      prompt += `\n\n[RECENT TASKS]\nYou recently completed these tasks. Do not repeat them unless asked:\n${recentTasks}\n`;
    }
    
    return prompt;
  }
}

export const aiMemory = new AIMemoryService();
