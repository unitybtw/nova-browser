/**
 * Language detection helper based on script characters and common stop-words.
 */
export function detectLanguage(text: string): string {
  if (!text) return 'tr-TR';
  const sample = text.substring(0, 1200).toLowerCase();

  // Turkish specific characters & stop words
  const turkishMatches = (sample.match(/[çğışöü]/gi) || []).length;
  const turkishWords = /\b(ve|bir|bu|da|de|için|ile|gibi|olan|olarak|çok|en|daha|ne|zaman|gün|yeni|iyi|son|ancak|kadar|sonra|üzerine|göre|önce|ben|sen|o|biz|siz|onlar)\b/gi;
  const trWordCount = (sample.match(turkishWords) || []).length;
  if (turkishMatches >= 2 || trWordCount >= 3) return 'tr-TR';

  // German stop words
  const deWordCount = (sample.match(/\b(und|der|die|das|in|von|zu|mit|sich|des|auf|für|ist|nicht|ein|eine|als|auch)\b/gi) || []).length;
  if (deWordCount >= 4) return 'de-DE';

  // French stop words
  const frWordCount = (sample.match(/\b(le|la|les|et|de|des|du|en|un|une|que|est|dans|pour|qui|sur|pas|par)\b/gi) || []).length;
  if (frWordCount >= 4) return 'fr-FR';

  // Spanish stop words
  const esWordCount = (sample.match(/\b(el|la|los|las|y|en|de|que|un|una|por|con|para|no|es|se|su|al|como)\b/gi) || []).length;
  if (esWordCount >= 4) return 'es-ES';

  return 'en-US';
}

/**
 * Ranks and selects the highest-fidelity, most natural voice for a given language.
 * Filters out legacy robotic voices.
 */
export function getBestVoice(voices: SpeechSynthesisVoice[], langCode: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const targetPrefix = langCode.toLowerCase().split('-')[0];
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetPrefix));
  const pool = langVoices.length > 0 ? langVoices : voices;

  const roboticNames = [
    'alex', 'fred', 'zarvox', 'trinoids', 'bells', 'boing', 'cellos', 
    'deranged', 'good news', 'hysterical', 'pipe organ', 'whisper', 
    'bad news', 'albert', 'junior', 'ralph', 'bahh', 'bubbles', 'organ'
  ];

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const name = v.name.toLowerCase();
    const vLang = v.lang.toLowerCase();
    
    // Penalize robotic legacy voices
    if (roboticNames.some(r => name.includes(r))) return -100;

    // Language match
    if (vLang === langCode.toLowerCase()) score += 25;
    else if (vLang.startsWith(targetPrefix)) score += 15;

    // Premium / Natural / Neural cloud voices
    if (name.includes('natural') || name.includes('online (natural)')) score += 50;
    if (name.includes('neural')) score += 45;
    if (name.includes('enhanced') || name.includes('premium')) score += 40;
    if (name.includes('google') && !name.includes('translate')) score += 30;
    if (name.includes('siri') || name.includes('compact') === false) score += 20;

    // High quality Turkish voices
    if (targetPrefix === 'tr') {
      if (name.includes('yelda')) score += 25;
      if (name.includes('ahmet') || name.includes('emel') || name.includes('filiz')) score += 20;
    }

    // High quality English voices
    if (targetPrefix === 'en') {
      if (['samantha', 'jenny', 'guy', 'ava', 'serena', 'zoe', 'oliver', 'nathan'].some(n => name.includes(n))) score += 20;
    }

    if (v.localService) score += 5;
    return score;
  };

  const sorted = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || null;
}

/**
 * Text-to-Speech service wrapping the Web Speech API with natural voice selection and language detection.
 */
class TTSService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();

  public subscribe(listener: (isSpeaking: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isSpeaking);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const speaking = this.isSpeaking;
    this.listeners.forEach(listener => listener(speaking));
  }

  public speak(text: string, lang?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API desteklenmiyor.'));
        return;
      }

      // Stop any previous speech
      this.stop();

      const targetLang = lang || detectLanguage(text);

      // Chunk text to stay within browser limits (~200 chars per utterance)
      const chunks = this._chunkText(text, 220);
      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          this._isSpeaking = false;
          this.notify();
          resolve();
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunks[index++]);
        utt.lang = targetLang;
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const bestVoice = getBestVoice(voices, targetLang);
        if (bestVoice) {
          utt.voice = bestVoice;
        }

        utt.onend = () => {
          setTimeout(speakNext, 30); // Natural pause between chunks
        };
        utt.onerror = (e) => { 
          this._isSpeaking = false; 
          this.notify();
          reject(e); 
        };

        this.utterance = utt;
        this._isSpeaking = true;
        this.notify();
        window.speechSynthesis.speak(utt);
      };

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
    this.notify();
  }

  public get isSpeaking(): boolean {
    return this._isSpeaking || (window.speechSynthesis?.speaking ?? false);
  }

  private _chunkText(text: string, maxLen: number): string[] {
    if (!text) return [];
    const strText = String(text);
    const sentences = strText.match(/[^.!?\n]+[.!?\n]*/g) ?? [strText];
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
