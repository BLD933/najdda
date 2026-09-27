import { Languages } from 'lucide-react';
import { useTranslation } from './I18nContext';

// A real radio group, like ThemeToggle: two options, one current value, and the
// selection is announced rather than inferred from colour.
const OPTIONS = [
  { value: 'fr', label: 'FR', name: 'Français' },
  { value: 'en', label: 'EN', name: 'English' },
];

const LanguageSwitcher = () => {
  const { lang, setLang, t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('language.switcher.label')}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1"
    >
      <Languages size={14} className="mx-1 text-ink-subtle" aria-hidden="true" />
      {OPTIONS.map(({ value, label, name }) => {
        const selected = lang === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            // `lang` on the option itself: an English screen reader should read
            // "Français" with a French voice, not try to pronounce it as
            // English. WCAG 3.1.2 Language of Parts.
            lang={value}
            aria-label={name}
            title={name}
            onClick={() => setLang(value)}
            className={`flex h-7 items-center rounded-full px-2.5 text-[11px] font-black tracking-wide transition-colors ${
              selected ? 'bg-primary text-on-primary' : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
