import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import fr from './locales/fr.js';
import en from './locales/en.js';

// FR is the default: CLAUDE.md makes French the primary patient-facing
// language. 'en' is opt-in and remembered per browser.
export const DEFAULT_LANG = 'fr';
export const LANGS = ['fr', 'en'];

const DICTS = { fr, en };
const STORAGE_KEY = 'najdda-lang';

// Keys with no entry in the active dictionary. Surfaced in dev so a missing
// translation fails loudly in the console instead of quietly shipping an
// English string into a French build.
let missing = new Set();

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(stored) ? stored : DEFAULT_LANG;
  });

  const setLang = useCallback((value) => {
    if (!LANGS.includes(value)) return;
    setLangState(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  // `lang` on <html> is not cosmetic: a screen reader picks its pronunciation
  // voice from it. French text under lang="en" is read with an English voice,
  // which for medical terms (dose, tension, allergie) is not just ugly but
  // misleading. WCAG 3.1.1 Language of Page.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (import.meta.env.DEV && missing.size > 0) {
      console.warn(
        `[i18n] missing ${missing.size} key(s) in "${lang}":`,
        [...missing].join(', '),
      );
    }
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      // Fall back to English before giving up, then to the key itself — a raw
      // key is ugly but it is debuggable, and it never renders as blank.
      let str = DICTS[lang]?.[key];
      if (str === undefined) {
        if (lang !== 'en') str = DICTS.en[key];
        if (str === undefined) {
          missing.add(key);
          return key;
        }
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

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const I18nContext = createContext();

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
};
