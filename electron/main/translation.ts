import { ipcMain } from 'electron';
import fetch from 'cross-fetch';

type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

const MAX_TRANSLATION_ITEMS = 500;
const MAX_TRANSLATION_TEXT_CHARS = 4000;
const MAX_TRANSLATION_TOTAL_CHARS = 100_000;

export async function translateTextWithGoogle(
  text: string, 
  sourceLang: string = 'auto', 
  targetLang: string = 'tr',
  getUserAgent: () => string
): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': getUserAgent(),
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) {
    throw new Error(`Translation failed with status ${res.status}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].map((item: any) => item[0] || '').join('');
  }
  return text;
}

export async function detectLanguageWithGoogle(
  sampleText: string,
  getUserAgent: () => string
): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=en&dt=t&q=${encodeURIComponent(sampleText.slice(0, 300))}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getUserAgent(),
      },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && typeof data[2] === 'string') {
        return data[2]; // e.g. 'en', 'de', 'es', 'fr', 'tr', 'ru', 'ja'
      }
    }
  } catch (err) {
    console.warn('[Translate] Language detection error:', err);
  }
  return 'auto';
}

export function escapeHtmlForTranslation(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function unescapeHtmlForTranslation(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function initTranslation(
  isTrustedSender: TrustedSenderCheck,
  getUserAgent: () => string
): void {
  ipcMain.handle('translate-text-batch', async (event, payload: unknown) => {
    if (!isTrustedSender(event)) return { error: 'Unauthorized', translations: [] };
    const input = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const rawTexts = Array.isArray(input.texts) ? input.texts : [];
    const safeTexts: string[] = [];
    let remainingChars = MAX_TRANSLATION_TOTAL_CHARS;

    for (const rawText of rawTexts.slice(0, MAX_TRANSLATION_ITEMS)) {
      if (typeof rawText !== 'string' || remainingChars <= 0) {
        safeTexts.push('');
        continue;
      }
      const text = rawText.slice(0, Math.min(MAX_TRANSLATION_TEXT_CHARS, remainingChars));
      safeTexts.push(text);
      remainingChars -= text.length;
    }

    if (safeTexts.length === 0) return { translations: [], success: true };

    const validLanguage = (value: unknown, fallback: string): string => {
      if (typeof value !== 'string' || !/^[a-zA-Z]{2,12}(?:[-_][a-zA-Z0-9]{2,12})?$/.test(value)) {
        return fallback;
      }
      return value;
    };
    const sLang = validLanguage(input.sourceLang, 'auto');
    const tLang = validLanguage(input.targetLang, 'tr');
    const texts = safeTexts;

    try {
      const results: string[] = [...texts];
      
      // Group into HTML payload chunks of ~1600 chars or ~35 elements
      const chunks: { indices: number[]; payload: string }[] = [];
      let currentIndices: number[] = [];
      let currentPayload = '';

      for (let i = 0; i < texts.length; i++) {
        const txt = texts[i] || '';
        if (!txt.trim()) continue;
        
        const itemHtml = `<p id="${i}">${escapeHtmlForTranslation(txt)}</p>`;
        if (currentIndices.length >= 35 || (currentPayload.length + itemHtml.length > 1600 && currentIndices.length > 0)) {
          chunks.push({ indices: currentIndices, payload: currentPayload });
          currentIndices = [i];
          currentPayload = itemHtml;
        } else {
          currentIndices.push(i);
          currentPayload += itemHtml;
        }
      }

      if (currentIndices.length > 0) {
        chunks.push({ indices: currentIndices, payload: currentPayload });
      }

      // Process chunks concurrently (up to 3 at a time)
      const CONCURRENCY = 3;
      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (chunk) => {
          try {
            const rawTranslated = await translateTextWithGoogle(chunk.payload, sLang, tLang, getUserAgent);
            const regex = /<p id="?(\d+)"?>([\s\S]*?)<\/p>/gi;
            let match;
            while ((match = regex.exec(rawTranslated)) !== null) {
              const idx = parseInt(match[1], 10);
              const content = unescapeHtmlForTranslation(match[2].trim());
              if (idx >= 0 && idx < results.length && content) {
                results[idx] = content;
              }
            }
          } catch (err: any) {
            console.warn('[Translate] Chunk translation failed:', err.message);
          }
        }));
        if (i + CONCURRENCY < chunks.length) {
          await new Promise(r => setTimeout(r, 60));
        }
      }

      return { translations: results, success: true };
    } catch (err: any) {
      console.error('[Translate] Batch translation error:', err);
      return { error: err.message || 'Translation failed', translations: texts, success: false };
    }
  });

  ipcMain.handle('detect-language', async (event, sampleText: string) => {
    if (!isTrustedSender(event)) return 'auto';
    if (!sampleText || typeof sampleText !== 'string') return 'auto';
    return await detectLanguageWithGoogle(sampleText, getUserAgent);
  });
}
