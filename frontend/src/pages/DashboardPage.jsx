import React from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import {
  Settings,
  ChevronRight,
  Activity as ActivityIcon,
  ShieldAlert,
  MapPin
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { tValue, isEmptyValue } from '../features/i18n/valueLabels';

const EMERGENCY_BY_COUNTRY = {
  Morocco: '150', Algeria: '14', Tunisia: '190', France: '15', USA: '911', Canada: '911', UK: '999', Spain: '112',
};

// Micro-labels: 10px uppercase. At that size `ink-subtle` is the floor, never
// `ink-muted` — the audit put slate-400 on white at 2.56:1.
const MicroLabel = ({ children, className = '' }) => (
  <span className={`block text-[10px] font-black uppercase tracking-[0.2em] text-ink-subtle ${className}`}>
    {children}
  </span>
);

const EmptyNote = ({ children }) => (
  <p className="text-sm italic text-ink-muted">{children}</p>
);

// Written out in full rather than interpolated: Tailwind scans source text, so
// `hover:border-${accent}` would compile to nothing.
const SERVICE_TONE = {
  primary: {
    card: 'hover:border-primary hover:shadow-card-hover',
    icon: 'bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-on-primary',
    title: 'text-primary',
    cta: 'text-primary',
    ghost: 'group-hover:text-primary-subtle',
  },
  emergency: {
    card: 'hover:border-emergency hover:shadow-card-hover',
    icon: 'bg-emergency-subtle text-emergency group-hover:bg-emergency group-hover:text-on-emergency',
    title: 'text-emergency',
    cta: 'text-emergency',
    ghost: 'group-hover:text-emergency-subtle',
  },
};

const ServiceCard = ({ tone, onClick, Icon, title, description, cta, index }) => {
  const t = SERVICE_TONE[tone];

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-ui-xl border-2 border-line bg-surface p-8 text-left transition-all duration-300 ${t.card}`}
    >
      <div className="relative z-10">
        <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-ui-md transition-colors duration-300 ${t.icon}`}>
          <Icon size={32} aria-hidden="true" />
        </div>
        <h3 className={`mb-2 text-2xl font-black tracking-tight ${t.title}`}>{title}</h3>
        <p className="text-sm font-medium leading-relaxed text-ink-muted">{description}</p>
        <div className={`mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100 ${t.cta}`}>
          {cta} <ChevronRight size={14} aria-hidden="true" />
        </div>
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-4 -right-2 text-9xl font-black text-surface-2 transition-colors ${t.ghost}`}
      >
        {index}
      </span>
    </button>
  );
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const emergencyNumber = EMERGENCY_BY_COUNTRY[user?.profile?.country || 'Morocco'] || '112';
  const firstName = user?.fullName?.split(' ')[0];

  // 'Salam, {name}.' → ['Salam, ', '.'] so the name can be coloured on its own.
  const greetBefore = t('dashboard.hero.greeting').split('{name}')[0];
  const greetAfter = t('dashboard.hero.greeting').split('{name}').slice(1).join('{name}');

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-primary-subtle">
      <nav className="sticky top-0 z-sticky flex items-center justify-between border-b border-line bg-surface px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-ui-sm bg-primary text-xl font-black text-on-primary">S</div>
          <h1 className="text-xl font-black uppercase tracking-tighter">{t('brand.name')}</h1>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden items-center gap-3 rounded-full border border-line bg-surface-2 px-4 py-1.5 md:flex">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{t('nav.systemLive')}</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/settings" className="group flex items-center gap-2 text-ink-muted transition-colors hover:text-primary">
              <Settings size={18} className="transition-transform duration-500 group-hover:rotate-90" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('nav.passport')}</span>
            </Link>
            <button onClick={logout} className="text-xs font-bold uppercase tracking-wider text-emergency transition-colors hover:text-emergency-hover">
              {t('nav.exit')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-8 p-8">
        <div className="col-span-12 space-y-8 lg:col-span-8">
          {/* Accent panel, not a second theme: `hero` is pinned dark in both
              themes, so nothing inside it needs a `dark:` override. */}
          <div className="relative overflow-hidden rounded-ui-xl bg-hero p-10 text-on-hero shadow-hero">
            <div className="relative z-10">
              <MicroLabel className="mb-4 !text-on-hero-muted">{t('dashboard.hero.status')}</MicroLabel>
              <h2 className="text-4xl font-black leading-none tracking-tight md:text-5xl">
                {/* Split on the {name} slot rather than concatenating in JS:
                    the greeting is one sentence in two colours, and the
                    punctuation after the name ("." here, but a translator may
                    make it " :" in French) belongs in the dictionary, not in
                    this component. */}
                {greetBefore}
                <span className="text-on-hero-accent">
                  {firstName || t('dashboard.hero.greetingFallback')}
                </span>
                {greetAfter}
              </h2>
              <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-on-hero-muted">
                {t('dashboard.hero.subtitle')}
              </p>
            </div>
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-[100px]" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ServiceCard
              tone="primary"
              index="01"
              onClick={() => navigate('/chat')}
              Icon={ActivityIcon}
              title={t('dashboard.service.triage.title')}
              description={t('dashboard.service.triage.description')}
              cta={t('dashboard.service.triage.cta')}
            />
            <ServiceCard
              tone="emergency"
              index="02"
              onClick={() => window.open(`tel:${emergencyNumber}`, '_self')}
              Icon={ShieldAlert}
              title={t('dashboard.service.sos.title')}
              description={t('dashboard.service.sos.description')}
              cta={t('dashboard.service.sos.cta')}
            />
          </div>
        </div>

        <aside className="col-span-12 space-y-8 lg:col-span-4">
          <div className="overflow-hidden rounded-ui-xl border-2 border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-6 py-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-subtle">{t('dashboard.identity.title')}</h3>
              <Link
                to="/settings"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-muted transition-all hover:border-primary hover:text-primary"
              >
                <Settings size={12} aria-hidden="true" />
                <span className="sr-only">{t('dashboard.identity.edit')}</span>
              </Link>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-ui-md border border-line bg-surface-2 p-4">
                  <MicroLabel className="mb-1">{t('dashboard.identity.bloodGroup')}</MicroLabel>
                  {/* `text-ink`, not `text-emergency`. A blood group is a stable
                      lab value, not a severity state, and the BMI tile beside
                      it is `text-ink` too. Painting it red implied a clinical
                      alert that does not exist, and the red additionally only
                      reached 3.89:1 on this tile in dark mode. `emergency` is
                      reserved for emergency affordances. */}
                  <span className="font-mono text-2xl font-black tracking-tighter text-ink">
                    {user?.profile?.bloodType || '--'}
                  </span>
                </div>
                <div className="rounded-ui-md border border-line bg-surface-2 p-4">
                  <MicroLabel className="mb-1">{t('dashboard.identity.bmi')}</MicroLabel>
                  <span className="font-mono text-2xl font-black tracking-tighter text-ink">
                    {user?.profile?.weight && user?.profile?.height
                      ? (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(1)
                      : '--'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-subtle">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary" />
                  {t('dashboard.identity.chronic')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {/* The empty sentinel is filtered OUT of the chip list rather
                      than rendered as a chip. The backend seeds 'None (Healthy)'
                      but a profile that skipped the wizard stores a bare 'None',
                      so an equality test missed it and a French dashboard showed
                      a chip reading "NONE" where the empty note belongs. */}
                  {user?.profile?.chronicDiseases
                    ?.split(', ')
                    .filter((d) => !isEmptyValue(d))
                    .map((d, i) => (
                      <span key={i} className="rounded-ui-sm border border-line bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight text-ink-subtle">
                        {tValue(d, 'chronic', lang)}
                      </span>
                    ))}
                  {isEmptyValue(user?.profile?.chronicDiseases) && (
                    <EmptyNote>{t('dashboard.identity.chronicEmpty')}</EmptyNote>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-t border-line pt-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-subtle">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-success" />
                  {t('dashboard.identity.medication')}
                </h4>
                <div className="space-y-2">
                  {user?.profile?.medications?.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="max-w-[150px] truncate font-black uppercase tracking-tight text-ink-subtle">{m.nom}</span>
                      <span className="font-mono text-ink-muted">{m.dosage1}</span>
                    </div>
                  ))}
                  {(!user?.profile?.medications || user?.profile?.medications.length === 0) && (
                    <EmptyNote>{t('dashboard.identity.medicationEmpty')}</EmptyNote>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-hero px-6 py-4 text-on-hero">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase leading-none tracking-widest text-on-hero-muted">{t('dashboard.identity.lastUpdated')}</span>
                <span className="mt-1 font-mono text-[10px] font-bold leading-none">
                  {/* toLocaleDateString() with no locale renders 09/27/2026 in
                      the US and 27/09/2026 in France. A patient reading their own
                      passport needs their own format. */}
                  {user?.profile?.updatedAt
                    ? new Date(user.profile.updatedAt).toLocaleDateString(lang)
                    : t('dashboard.identity.notSaved')}
                </span>
              </div>
              {/* `on-hero-accent`, not `primary`: the footer is a `hero`
                  surface, and `primary` is only pinned in dark — light-mode
                  primary measures 3.45:1 here. The icon is decorative
                  (aria-hidden), so this is not a 1.4.11 failure, but it is the
                  same wrong-token choice, and it sits 20px from a date a
                  patient reads. */}
              <ShieldAlert size={16} className="text-on-hero-accent opacity-50" aria-hidden="true" />
            </div>
          </div>

          <div className="rounded-ui-xl bg-primary p-6 text-on-primary shadow-card-hover">
            <MicroLabel className="!text-on-primary-muted">{t('dashboard.hospital.title')}</MicroLabel>
            <p className="mt-2 font-bold leading-tight">{user?.profile?.preferredHospital || t('dashboard.hospital.none')}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="font-mono text-[10px] text-on-primary-muted">
                {user?.profile?.latitude
                  ? `${user.profile.latitude.toFixed(4)}, ${user.profile.longitude.toFixed(4)}`
                  : t('dashboard.hospital.notSet')}
              </div>
              <MapPin size={14} className="text-on-primary-muted" aria-hidden="true" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
