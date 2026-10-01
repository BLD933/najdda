import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import fr from './locales/fr.js';
import en from './locales/en.js';
import ar from './locales/ar.js';
import ary from './locales/ary.js';
import tzm from './locales/tzm.js';
import { readStore, writeStore } from '../../utils/storage';

// FR is the default: French is the primary patient-facing language.
// ar = Modern Standard Arabic (RTL), ary = Moroccan Darija (RTL, Arabic
// script), tzm = Tamazight (Latin script — no dependable Tifinagh system
// font on patient devices, and Latin Tamazight is widely read in Morocco).
export const DEFAULT_LANG = 'fr';
export const LANGS = ['fr', 'en', 'ar', 'ary', 'tzm'];
export const RTL_LANGS = new Set(['ar', 'ary']);

// BCP47 tags for <html lang> so screen readers pick the right voice.
export const HTML_LANG = { fr: 'fr', en: 'en', ar: 'ar', ary: 'ary', tzm: 'tzm' };

// Fallback chains before the ultimate English fallback: Darija falls back to
// MSA (closest written variety), Tamazight to French (care default).
const FALLBACKS = { ary: ['ar'], tzm: ['fr'] };

const DICTS = { fr, en, ar, ary, tzm };
const STORAGE_KEY = 'najdda-lang';

// Keys with no entry in the active dictionary chain. Surfaced in dev so a
// missing translation fails loudly in the console instead of quietly shipping
// an English string into an Arabic build.
let missing = new Set();

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const stored = readStore(STORAGE_KEY);
    return LANGS.includes(stored) ? stored : DEFAULT_LANG;
  });

  const setLang = useCallback((value) => {
    if (!LANGS.includes(value)) return;
    setLangState(value);
    writeStore(STORAGE_KEY, value);
  }, []);

  // `lang` + `dir` on <html>: a screen reader picks pronunciation from lang,
  // and RTL layout (ar/ary) needs dir="rtl". WCAG 3.1.1 / 3.1.2.
  // Note: components use physical Tailwind utilities (ml-, left-), so RTL
  // flips flex/grid direction automatically but not physical offsets — new
  // code should prefer logical properties (ms-, me-, start-, end-).
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang] || lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    // Reported per language, not cumulatively: the Set lived at module scope
    // and was never cleared, so switching FR→AR re-reported the keys AR had
    // already resolved, burying the real gaps.
    if (import.meta.env.DEV && missing.size > 0) {
      console.warn(
        `[i18n] missing ${missing.size} key(s) in "${lang}" chain:`,
        [...missing].join(', '),
      );
    }
    missing = new Set();
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      // Walk the fallback chain, then English, then the key itself — a raw
      // key is ugly but debuggable, and never renders blank.
      const chain = [lang, ...(FALLBACKS[lang] || []), 'en'];
      let str;
      for (const l of chain) {
        str = DICTS[l]?.[key];
        if (str !== undefined) break;
      }
      if (str === undefined) {
        missing.add(key);
        return key;
      }
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          str = str.split(`{${name}}`).join(String(value));
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, isRTL: RTL_LANGS.has(lang) }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const I18nContext = createContext();

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
};
