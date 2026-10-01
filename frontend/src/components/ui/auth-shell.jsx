import React from 'react';
import ThemeToggle from '../../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../../features/i18n/LanguageSwitcher';
import { useTranslation } from '../../features/i18n/I18nContext';

/* Split auth shell: brand gradient panel + glass form. On mobile the brand
   panel collapses to a compact header — same DOM, no duplicate content. */
const AuthShell = ({ children }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div aria-hidden="true" className="aurora" />
      <div className="absolute end-6 top-6 z-10 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-ui-xl shadow-hero md:grid-cols-2">
        <div className="brand-gradient relative hidden flex-col justify-between p-10 text-white md:flex">
          <div aria-hidden="true" className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-[80px]" />
          <div aria-hidden="true" className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-black/20 blur-[80px]" />
          <div className="relative flex items-center gap-3">
            <img src="/logo-icon.png" alt="" aria-hidden="true" className="h-11 w-11 rounded-ui-sm object-cover shadow-card" />
            <span className="text-2xl font-black uppercase tracking-tighter">{t('brand.name')}</span>
          </div>
          <div className="relative">
            <p className="text-3xl font-black leading-tight tracking-tight">
              {t('brand.tagline')}
            </p>
            <div aria-hidden="true" className="mt-6 flex gap-2">
              <span className="h-1.5 w-10 rounded-full bg-white" />
              <span className="h-1.5 w-4 rounded-full bg-white/50" />
              <span className="h-1.5 w-4 rounded-full bg-white/50" />
            </div>
          </div>
        </div>

        <div className="glass-strong p-8 md:rounded-l-none md:rounded-r-ui-xl">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <img src="/logo-icon.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-ui-sm object-cover shadow-card" />
            <span className="text-lg font-black uppercase tracking-tighter text-brand-navy dark:text-ink">{t('brand.name')}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
