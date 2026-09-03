// Nova Browser - One-Click Web Page Translation Service

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export interface PageTranslationState {
  isTranslated: boolean;
  sourceLang: string;
  targetLang: string;
  isLoading: boolean;
  error?: string | null;
  detectedLangName?: string;
}

/**
 * Returns JavaScript code to extract all visible text nodes from the webview DOM.
 * Tags the text nodes with IDs and preserves original values.
 */
export function getExtractTextNodesScript(): string {
  return `
    (() => {
      try {
        if (!window.__novaTranslationMap) {
          window.__novaTranslationMap = new Map();
        }

        const ignoredTags = new Set([
          'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CODE', 'PRE', 
          'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'AUDIO', 'VIDEO'
        ]);

        const textNodes = [];
        const texts = [];
        let combinedSample = '';

        const walker = document.createTreeWalker(
          document.body || document.documentElement,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent || ignoredTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
              
              // Skip hidden elements
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
              }

              const val = node.nodeValue ? node.nodeValue.trim() : '';
              if (!val || val.length <= 1 || /^[\\d\\s.,;:!?'"()\\[\\]{}@#$%^&*+=<>_~\\/|\\\\-]+$/.test(val)) {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode;
        let index = 0;
        while ((currentNode = walker.nextNode())) {
          const originalText = currentNode.nodeValue || '';
          if (!window.__novaTranslationMap.has(index)) {
            window.__novaTranslationMap.set(index, originalText);
          }
          textNodes.push(index);
          texts.push(originalText);

          if (combinedSample.length < 500 && originalText.length > 5) {
            combinedSample += originalText + ' ';
          }
          index++;
        }

        window.__novaCurrentNodeCount = index;
        return {
          success: true,
          count: texts.length,
          texts: texts,
          sampleText: combinedSample.trim() || document.title || ''
        };
      } catch (err) {
        return { success: false, error: err.message, texts: [], sampleText: '' };
      }
    })();
  `;
}

/**
 * Returns JavaScript code to apply translated texts back to the tagged text nodes.
 */
export function getApplyTranslationScript(translatedTexts: string[], targetLang: string): string {
  // Serialize translated texts and language tag safely to prevent script injection
  const serialized = JSON.stringify(translatedTexts);
  const safeTargetLang = JSON.stringify(String(targetLang || '').replace(/[^a-zA-Z0-9_-]/g, ''));
  return `
    (() => {
      try {
        const translations = ${serialized};
        if (!Array.isArray(translations) || !window.__novaTranslationMap) {
          return { success: false, error: 'No translation map found' };
        }

        const ignoredTags = new Set([
          'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CODE', 'PRE', 
          'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'AUDIO', 'VIDEO'
        ]);

        const walker = document.createTreeWalker(
          document.body || document.documentElement,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent || ignoredTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
              
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
              }

              const val = node.nodeValue ? node.nodeValue.trim() : '';
              if (!val || val.length <= 1 || /^[\\d\\s.,;:!?'"()\\[\\]{}@#$%^&*+=<>_~\\/|\\\\-]+$/.test(val)) {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode;
        let index = 0;
        while ((currentNode = walker.nextNode())) {
          if (index < translations.length && typeof translations[index] === 'string' && translations[index].trim()) {
            currentNode.nodeValue = translations[index];
          }
          index++;
        }

        document.documentElement.setAttribute('data-nova-translated', ${safeTargetLang});
        document.documentElement.setAttribute('lang', ${safeTargetLang});

        return { success: true, updatedCount: index };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })();
  `;
}

/**
 * Returns JavaScript code to restore all text nodes to their original pre-translation state.
 */
export function getRestoreOriginalScript(): string {
  return `
    (() => {
      try {
        if (!window.__novaTranslationMap || window.__novaTranslationMap.size === 0) {
          return { success: false, error: 'No original text stored' };
        }

        const ignoredTags = new Set([
          'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CODE', 'PRE', 
          'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'AUDIO', 'VIDEO'
        ]);

        const walker = document.createTreeWalker(
          document.body || document.documentElement,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent || ignoredTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
              
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
              }

              const val = node.nodeValue ? node.nodeValue.trim() : '';
              if (!val || val.length <= 1 || /^[\\d\\s.,;:!?'"()\\[\\]{}@#$%^&*+=<>_~\\/|\\\\-]+$/.test(val)) {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode;
        let index = 0;
        while ((currentNode = walker.nextNode())) {
          if (window.__novaTranslationMap.has(index)) {
            currentNode.nodeValue = window.__novaTranslationMap.get(index);
          }
          index++;
        }

        document.documentElement.removeAttribute('data-nova-translated');
        return { success: true, restoredCount: index };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })();
  `;
}
