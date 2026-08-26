export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'fact' | 'instruction';
  createdAt: number;
  /**
   * 🔒 Security provenance: 'user' = entered directly by the user,
   * 'tool' = saved by the AI via the save_to_memory tool while a tool call was
   * executing. Tool-saved 'instruction' entries are session-only: they are
   * never persisted and therefore never injected into future system prompts.
   */
  source?: 'user' | 'tool';
}

export interface TaskSummary {
  id: string;
  summary: string;
  timestamp: number;
}

// v2: adds the `source` provenance field. Legacy v1 data is migrated safely:
// entries are treated as source:'user', EXCEPT instruction-category entries
// which are dropped entirely (they may be persisted prompt injections).
const STORAGE_KEY = 'browser_ai_memory_vault_v2';
const LEGACY_STORAGE_KEY = 'browser_ai_memory_vault_v1';
const TASK_STORAGE_KEY = 'browser_ai_task_history_v1';

class AIMemoryService {
  private memories: MemoryItem[] = [];
  private taskHistory: TaskSummary[] = [];

  constructor() {
    this.loadMemories();
    this.loadTaskHistory();
  }

  private loadMemories() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.memories = JSON.parse(data);
        return;
      }
      // One-time migration from v1: keep entries as user-sourced, but drop
      // instruction-category entries (possible persisted prompt injections).
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          this.memories = parsed
            .filter((m: any) => m && typeof m.fact === 'string' && m.category !== 'instruction')
            .map((m: any) => ({ ...m, source: 'user' as const }));
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to load AI memories from localStorage', e);
    }
  }

  private loadTaskHistory() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(TASK_STORAGE_KEY);
      if (data) {
        this.taskHistory = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load task history', e);
    }
  }

  /**
   * 🔒 Security: memories saved by a TOOL with category 'instruction' are
   * session-only — they must never reach localStorage, so they can never be
   * injected into the system prompt of a future session.
   */
  private isPersistable(m: MemoryItem): boolean {
    return !(m.source === 'tool' && m.category === 'instruction');
  }

  private saveMemories() {
    if (typeof localStorage === 'undefined') return;
    try {
      const persistable = this.memories.filter(m => this.isPersistable(m));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (e) {
      console.error('Failed to save AI memories', e);
    }
  }

  private saveTaskHistory() {
    if (typeof localStorage === 'undefined') return;
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

  public addMemory(
    fact: string,
    category: 'preference' | 'fact' | 'instruction' = 'fact',
    fromTool: boolean = false
  ): MemoryItem {
    const existing = this.memories.find(m => m.fact.toLowerCase().trim() === fact.toLowerCase().trim());
    if (existing) return existing;

    const newItem: MemoryItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fact,
      category,
      createdAt: Date.now(),
      source: fromTool ? 'tool' : 'user',
    };

    this.memories.push(newItem);
    if (this.memories.length > 100) {
      this.memories = this.memories.slice(-100);
    }
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
