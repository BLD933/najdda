import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../../i18n/I18nContext';

const OPTIONS = [
  { value: 'light', Icon: Sun, key: 'theme.light' },
  { value: 'dark', Icon: Moon, key: 'theme.dark' },
  { value: 'system', Icon: Monitor, key: 'theme.system' },
];

// Rendered as a real radio group: three states, not a boolean toggle, so
// "follow the system" stays reachable and the current state is announced.
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1"
    >
      {OPTIONS.map(({ value, Icon, key }) => {
        const selected = theme === value;
        const label = t(key);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              selected
                ? 'bg-primary text-on-primary'
                : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
            }`}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
