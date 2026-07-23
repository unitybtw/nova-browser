/**
 * Text-to-Speech service wrapping the Web Speech API.
 * Singleton so the AI agent and UI can both control playback.
 */
class TTSService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;

  public speak(text: string, lang: string = 'tr-TR'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API desteklenmiyor.'));
        return;
      }

      // Stop any previous speech
      this.stop();

      // Chunk text to stay within browser limits (~200 chars per utterance)
      const chunks = this._chunkText(text, 200);
      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          this._isSpeaking = false;
          resolve();
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunks[index++]);
        utt.lang = lang;
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        // Try to pick a native voice for the language
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (preferredVoice) utt.voice = preferredVoice;

        utt.onend = speakNext;
        utt.onerror = (e) => { this._isSpeaking = false; reject(e); };

        this.utterance = utt;
        this._isSpeaking = true;
        window.speechSynthesis.speak(utt);
      };

      // Voices may not be loaded yet; wait if needed
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => { speakNext(); };
      } else {
        speakNext();
      }
    });
  }

  public stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this._isSpeaking = false;
    this.utterance = null;
  }

  public get isSpeaking(): boolean {
    return this._isSpeaking || (window.speechSynthesis?.speaking ?? false);
  }

  private _chunkText(text: string, maxLen: number): string[] {
    if (!text) return [];
    const strText = String(text);
    const sentences = strText.match(/[^.!?]+[.!?]*/g) ?? [strText];
    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
      if ((current + s).length > maxLen) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
  }
}

export const tts = new TTSService();
