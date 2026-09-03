export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'fact' | 'instruction';
  createdAt: number;
  /**
   * Security provenance: 'user' = entered directly by the user,
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
   * Security: memories saved by a TOOL with category 'instruction' are
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
    } catch (e: any) {
      console.warn('Failed to save AI memories, attempting quota recovery trim...', e);
      try {
        // Drop oldest 50% on quota pressure
        this.memories = this.memories.slice(Math.floor(this.memories.length / 2));
        const persistable = this.memories.filter(m => this.isPersistable(m));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
      } catch (retryErr) {
        console.error('AI memories save recovery failed:', retryErr);
      }
    }
  }

  private saveTaskHistory() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(this.taskHistory));
    } catch (e: any) {
      console.warn('Failed to save task history, attempting quota recovery trim...', e);
      try {
        // Drop oldest 50% on quota pressure
        this.taskHistory = this.taskHistory.slice(0, Math.floor(this.taskHistory.length / 2));
        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(this.taskHistory));
      } catch (retryErr) {
        console.error('Task history save recovery failed:', retryErr);
      }
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
    const cleanFact = this.redactSensitiveInfo(fact || '').trim().slice(0, 250);
    if (!cleanFact) {
      return {
        id: 'noop',
        fact: '',
        category,
        createdAt: Date.now(),
        source: fromTool ? 'tool' : 'user'
      };
    }

    const existing = this.memories.find(m => m.fact.toLowerCase().trim() === cleanFact.toLowerCase());
    if (existing) return existing;

    const newItem: MemoryItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fact: cleanFact,
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

  private redactSensitiveInfo(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/(?:password|passwd|pwd|token|api[_-]?key|secret)\s*[:=]\s*["']?[^\s"']+["']?/gi, '[REDACTED_CREDENTIAL]')
      .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/\b[A-Za-z0-9+/]{40,}\b/g, '[REDACTED_BLOB]');
  }

  public addTaskSummary(summary: string): TaskSummary {
    const cleanSummary = this.redactSensitiveInfo(summary);
    const task: TaskSummary = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      summary: cleanSummary,
      timestamp: Date.now(),
    };
    
    this.taskHistory.unshift(task); // Add to beginning
    if (this.taskHistory.length > 50) {
      this.taskHistory.pop(); // Keep only last 50 tasks
    }
    
    this.saveTaskHistory();
    return task;
  }

  public deleteTask(id: string): void {
    this.taskHistory = this.taskHistory.filter(t => t.id !== id);
    this.saveTaskHistory();
  }

  public clearAllTasks(): void {
    this.taskHistory = [];
    this.saveTaskHistory();
  }

  public deleteMemory(id: string): void {
    this.memories = this.memories.filter(m => m.id !== id);
    this.saveMemories();
  }

  public clearAllMemories(): void {
    this.memories = [];
    this.saveMemories();
  }

  /**
   * Auto-extracts durable user facts, names, and preferences from conversational turns.
   */
  public extractAndSaveUserFacts(userQuery: string): MemoryItem | null {
    if (!userQuery || typeof userQuery !== 'string') return null;
    const text = userQuery.trim();

    // 1. Name declarations
    const nameMatch = text.match(/(?:benim\s+adım|adım|ismim|my\s+name\s+is|call\s+me)\s+([A-Za-zÇçĞğİıÖöŞşÜü]{2,25})/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      const forbidden = ['bir', 'bu', 've', 'ile', 'the', 'a', 'an', 'what', 'who'];
      if (!forbidden.includes(name.toLowerCase())) {
        return this.addMemory(`User's name is ${name}`, 'fact', false);
      }
    }

    // 2. Preferences (e.g. "I prefer dark mode", "Yanıtları kısa tut", "Her zaman Türkçe yanıt ver")
    if (/(?:yanıtları\s+kısa\s+tut|kısa\s+cevap\s+ver|keep\s+(?:answers|responses)\s+short)/i.test(text)) {
      return this.addMemory('Keep answers concise and short', 'preference', false);
    }
    if (/(?:her\s+zaman\s+türkçe|türkçe\s+cevap\s+ver|always\s+reply\s+in\s+turkish)/i.test(text)) {
      return this.addMemory('Always reply in Turkish', 'preference', false);
    }
    if (/(?:always\s+reply\s+in\s+english|ingilizce\s+cevap\s+ver)/i.test(text)) {
      return this.addMemory('Always reply in English', 'preference', false);
    }
    if (/(?:karanlık\s+tema\s+tercih|koyu\s+tema\s+tercih|i\s+prefer\s+dark\s+theme|prefer\s+dark\s+mode)/i.test(text)) {
      return this.addMemory('User prefers dark theme', 'preference', false);
    }

    return null;
  }

  public getFormattedMemoryPrompt(): string {
    let prompt = '';
    if (this.memories.length > 0) {
      // Security & Context Budget: exclude untrusted tool observations and cap to 10 verified preferences (max 1200 chars)
      const allowedMemories = this.memories
        .filter(m => m.source !== 'tool' || m.category === 'preference')
        .slice(-10);

      let totalChars = 0;
      const safeFacts: string[] = [];
      for (const m of allowedMemories) {
        const cleanFact = (m.fact || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150);
        if (totalChars + cleanFact.length > 1200) break;
        totalChars += cleanFact.length;
        safeFacts.push(`- [${m.category.toUpperCase()}] ${cleanFact}`);
      }

      if (safeFacts.length > 0) {
        prompt += `\n\n[USER MEMORY VAULT]\nHere are things you remember about the user from past interactions:\n${safeFacts.join('\n')}\nUse these to personalize your responses and behavior automatically.\n`;
      }
    }
    
    if (this.taskHistory.length > 0) {
      let taskChars = 0;
      const safeTasks: string[] = [];
      for (const t of this.taskHistory.slice(0, 4)) {
        const cleanTask = this.redactSensitiveInfo(t.summary || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 150);
        if (!cleanTask) continue;
        if (taskChars + cleanTask.length > 600) break;
        taskChars += cleanTask.length;
        safeTasks.push(`- ${cleanTask}`);
      }
      if (safeTasks.length > 0) {
        prompt += `\n\n[RECENT TASKS]\nYou recently completed these tasks. Do not repeat them unless asked:\n${safeTasks.join('\n')}\n`;
      }
    }
    
    return prompt;
  }
}

export const aiMemory = new AIMemoryService();
