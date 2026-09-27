import { logger } from '../utils/logger';

/**
 * Language detection helper based on script characters and common stop-words.
 *
 * Every language is scored and the winner is the highest score. The previous
 * version returned on the first language that cleared an absolute threshold in
 * a fixed order, so shared tokens decided everything: "de" is both a French and
 * a Spanish function word, and "in"/"is"/"a" style English text could reach the
 * German threshold, which made Spanish read aloud with Turkish phonetics.
 */
export function detectLanguage(text: string): string {
  if (!text) return 'tr-TR';
  const sample = text.substring(0, 1200).toLowerCase();

  // Turkish-specific characters are near-decisive on their own: no other
  // supported language uses ç/ğ/ı/ş/ö/ü in its alphabet.
  const turkishChars = (sample.match(/[çğışöü]/g) || []).length;
  if (turkishChars >= 2) return 'tr-TR';

  const count = (re: RegExp) => (sample.match(re) || []).length;

  const scores: Array<{ locale: string; score: number }> = [
    {
      locale: 'tr-TR',
      score: count(/\b(ve|bir|bu|için|ile|gibi|olan|olarak|çok|daha|zaman|gün|yeni|iyi|sonra|ancak|kadar|üzerine|göre|önce|ben|sen|biz|siz|onlar|her|biraz)\b/g),
    },
    {
      locale: 'de-DE',
      score: count(/\b(und|der|die|das|von|zu|mit|sich|des|auf|für|ist|nicht|ein|eine|als|auch|dass|wird|werden|einen|durch)\b/g),
    },
    {
      locale: 'fr-FR',
      score: count(/\b(le|la|les|et|des|du|une|est|dans|pour|qui|sur|pas|par|avec|sur|plus|nous|vous|être)\b/g),
    },
    {
      locale: 'es-ES',
      score: count(/\b(el|los|las|que|una|por|con|para|como|más|pero|sus|este|esta|del|son|muy|también|está)\b/g),
    },
    {
      locale: 'en-US',
      score: count(/\b(the|of|to|is|that|for|with|this|are|was|were|have|has|not|but|from|they|you|which|about)\b/g),
    },
  ];

  let best = scores[0];
  for (const entry of scores) {
    if (entry.score > best.score) best = entry;
  }
  return best.score > 0 ? best.locale : 'en-US';
}

/**
 * Intelligently splits article text into readable sentences without breaking on abbreviations or numbers.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'sentence' });
      const segments: string[] = [];
      for (const seg of segmenter.segment(text)) {
        const trimmed = seg.segment.trim();
        if (trimmed.length > 0) {
          segments.push(trimmed);
        }
      }
      if (segments.length > 0) return segments;
    } catch (_) {}
  }

  const protectedText = text
    .replace(/([0-9]+)\.([0-9]+)/g, '$1\u2024$2')
    .replace(/\b(Dr|Prof|Doç|Av|Uzm|Cad|Sok|No|vs|vb|v\.b|v\.s|e\.g|i\.e|etc|al|fig|vol)\./gi, '$1\u2024');

  const matches = protectedText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  return matches
    .map(s => s.replace(/\u2024/g, '.').trim())
    .filter(s => s.length > 0);
}

export interface NativeVoiceInfo {
  name: string;
  lang: string;
  description: string;
}

/**
 * Returns best default macOS voice name for a given language code.
 */
export function getMacDefaultVoice(langCode: string): string {
  const targetPrefix = langCode.toLowerCase().split('-')[0];
  if (targetPrefix === 'tr') return 'Yelda';
  if (targetPrefix === 'de') return 'Anna';
  if (targetPrefix === 'fr') return 'Thomas';
  if (targetPrefix === 'es') return 'Mónica';
  if (targetPrefix === 'it') return 'Alice';
  if (targetPrefix === 'ja') return 'Kyoko';
  if (targetPrefix === 'ru') return 'Milena';
  return 'Samantha';
}

/**
 * Ranks and selects the highest-fidelity, most natural voice for a given language (Web Speech fallback).
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

    if (roboticNames.some(r => name.includes(r))) return -100;

    if (vLang === langCode.toLowerCase()) score += 25;
    else if (vLang.startsWith(targetPrefix)) score += 15;

    if (name.includes('natural') || name.includes('online (natural)')) score += 50;
    if (name.includes('neural')) score += 45;
    if (name.includes('enhanced') || name.includes('premium')) score += 40;
    if (name.includes('google') && !name.includes('translate')) score += 30;
    // Award bonus for Siri voices, but NOT low-fidelity "compact" variants
    if (name.includes('siri') && !name.includes('compact')) score += 20;

    if (targetPrefix === 'tr') {
      if (name.includes('yelda')) score += 25;
      if (name.includes('ahmet') || name.includes('emel') || name.includes('filiz')) score += 20;
    }

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
 * Text-to-Speech service using native macOS high-fidelity voice synthesis with web fallback.
 */
class TTSService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private currentSessionId = 0;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();
  private pendingVoicesListener: (() => void) | null = null;

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

  public async speak(text: string, lang?: string, voiceName?: string, rate: number = 1.0): Promise<void> {
    if (!text || typeof text !== 'string') return;

    // Stop any existing speech and increment session
    this.stop();
    const sessionId = ++this.currentSessionId;
    const targetLang = lang || detectLanguage(text);

    // Prefer Native macOS Speech Engine
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsSpeak) {
      this._isSpeaking = true;
      this.notify();

      const chosenVoice = voiceName || getMacDefaultVoice(targetLang);
      try {
        const res = await (window as any).electronAPI.nativeTtsSpeak(text, chosenVoice, rate);
        if (sessionId !== this.currentSessionId) return; // Stale session, ignore result

        if (res && res.success) {
          this._isSpeaking = false;
          this.notify();
          return;
        }
      } catch (err) {
        logger.warn('TTS', 'Native TTS failed, falling back to Web Speech', err);
      }

      // Fallback to Web Speech if native failed and not cancelled
      if (sessionId === this.currentSessionId) {
        return this._webSpeak(text, targetLang, rate, sessionId);
      }
      return;
    }

    return this._webSpeak(text, targetLang, rate, sessionId);
  }

  private _webSpeak(text: string, targetLang: string, rate: number = 1.0, sessionId: number = this.currentSessionId): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      if (sessionId !== this.currentSessionId) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const chunks = this._chunkText(text, 220);
      let index = 0;

      const speakNext = () => {
        if (sessionId !== this.currentSessionId) {
          resolve();
          return;
        }

        if (index >= chunks.length) {
          this._isSpeaking = false;
          this.notify();
          resolve();
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunks[index++]);
        utt.lang = targetLang;
        utt.rate = rate;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const bestVoice = getBestVoice(voices, targetLang);
        if (bestVoice) {
          utt.voice = bestVoice;
        }

        utt.onend = () => {
          if (sessionId === this.currentSessionId) {
            setTimeout(speakNext, 30);
          } else {
            resolve();
          }
        };
        utt.onerror = () => {
          if (sessionId === this.currentSessionId) {
            this._isSpeaking = false;
            this.notify();
          }
          resolve();
        };

        this.utterance = utt;
        this._isSpeaking = true;
        this.notify();
        window.speechSynthesis.speak(utt);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        if (this.pendingVoicesListener) {
          window.speechSynthesis.removeEventListener('voiceschanged', this.pendingVoicesListener);
          this.pendingVoicesListener = null;
        }
        const onVoices = () => {
          if (this.pendingVoicesListener === onVoices) {
            window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
            this.pendingVoicesListener = null;
          }
          if (sessionId === this.currentSessionId) speakNext();
        };
        this.pendingVoicesListener = onVoices;
        window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      } else {
        speakNext();
      }
    });
  }

  public stop() {
    this.currentSessionId++;
    if (this.pendingVoicesListener && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.pendingVoicesListener);
      this.pendingVoicesListener = null;
    }
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsStop) {
      (window as any).electronAPI.nativeTtsStop().catch(() => {});
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this._isSpeaking = false;
    this.utterance = null;
    this.notify();
  }

  public get isSpeaking(): boolean {
    return this._isSpeaking || (typeof window !== 'undefined' && (window.speechSynthesis?.speaking ?? false));
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
