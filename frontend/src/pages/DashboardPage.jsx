import React from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import {
  Settings,
  ChevronRight,
  Activity as ActivityIcon,
  ShieldAlert,
  MapPin,
  Phone,
  Baby,
  Smile,
  Flower2,
  Pill,
} from 'lucide-react';
import DirIcon from '../components/ui/dir-icon';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation, HTML_LANG } from '../features/i18n/I18nContext';
import { tValue, isEmptyValue } from '../features/i18n/valueLabels';
import { getEmergencyNumber } from '../utils/emergency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';



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
    card: 'hover:border-primary/60 hover:shadow-card-hover',
    icon: 'bg-primary-subtle text-on-primary-subtle',
    title: 'text-ink',
    cta: 'bg-primary text-on-primary hover:bg-primary-hover',
    ghost: 'text-ink/5',
  },
  emergency: {
    card: 'hover:border-emergency/60 hover:shadow-card-hover',
    icon: 'bg-emergency-subtle text-on-emergency-subtle',
    title: 'text-ink',
    cta: 'bg-emergency text-on-emergency hover:bg-emergency-hover',
    ghost: 'text-ink/5',
  },
};

const ServiceCard = ({ tone, onClick, Icon, title, description, cta, index }) => {
  const t = SERVICE_TONE[tone];

  return (
    <Card className={`group relative overflow-hidden p-8 text-left ${t.card}`}>
      <button onClick={onClick} className="absolute inset-0 z-10 cursor-pointer" aria-label={`${title} — ${cta}`}>
        <span className="sr-only">{`${title} — ${cta}`}</span>
      </button>
      <div className="relative">
        <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-ui-md transition-transform duration-300 group-hover:scale-110 ${t.icon}`}>
          <Icon size={30} aria-hidden="true" />
        </div>
        <CardTitle className={`mb-2 ${t.title}`}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {/* Always visible: the old hover-only CTA was unreachable on touch
            and keyboard. `aria-hidden` here — the stretched button above
            already exposes the action. */}
        <div aria-hidden="true" className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-transform group-hover:translate-x-1 ${t.cta}`}>
          {cta} <DirIcon name={ChevronRight} size={14} aria-hidden="true" />
        </div>
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-6 -right-2 select-none text-[10rem] font-black leading-none ${t.ghost}`}
      >
        {index}
      </span>
    </Card>
  );
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const emergencyNumber = getEmergencyNumber(user?.profile?.country || 'Morocco');
  const firstName = user?.fullName?.split(' ')[0];

  // 'Salam, {name}.' → ['Salam, ', '.'] so the name can be coloured on its own.
  const greetBefore = t('dashboard.hero.greeting').split('{name}')[0];
  const greetAfter = t('dashboard.hero.greeting').split('{name}').slice(1).join('{name}');

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-primary-subtle">
      <div aria-hidden="true" className="aurora" />

      <nav className="glass-nav sticky top-0 z-sticky flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="" aria-hidden="true" className="h-9 w-9 rounded-ui-sm object-cover shadow-card" />
          <h1 className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-ink">{t('brand.name')}</h1>
        </div>

        <div className="flex items-center gap-8">
          <div className="glass hidden items-center gap-3 rounded-full px-4 py-1.5 md:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
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

      {/* Bento grid: hero spans full width, services + passport below. */}
      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6 p-8">
        {/* Brand hero: logo gradient surface, white text only. The mesh blobs
            are decoration (aria-hidden via parent); content stays on the
            gradient fill which is dark enough for white in both themes. */}
        <div className="brand-gradient relative col-span-12 overflow-hidden rounded-ui-xl p-10 text-white shadow-hero">
          <div aria-hidden="true" className="absolute -left-16 -top-24 h-80 w-80 rounded-full bg-white/15 blur-[90px]" />
          <div aria-hidden="true" className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-black/20 blur-[90px]" />
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/70">{t('dashboard.hero.status')}</p>
              <h2 className="text-4xl font-black leading-none tracking-tight md:text-5xl">
                {greetBefore}
                <span className="underline decoration-white/40 decoration-4 underline-offset-8">
                  {firstName || t('dashboard.hero.greetingFallback')}
                </span>
                {greetAfter}
              </h2>
              <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-white/80">
                {t('dashboard.hero.subtitle')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black uppercase tracking-wider text-on-brand shadow-elevated transition-transform hover:scale-105"
              >
                <ActivityIcon size={18} aria-hidden="true" />
                {t('dashboard.service.triage.cta')}
              </button>
              <a
                href={`tel:${emergencyNumber}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/50 px-7 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-white/15"
              >
                <Phone size={16} aria-hidden="true" />
                {t('dashboard.service.sos.cta')} · {emergencyNumber}
              </a>
            </div>
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-8">
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
            onClick={() => navigate('/emergency')}
            Icon={ShieldAlert}
            title={t('dashboard.service.sos.title')}
            description={t('dashboard.service.sos.description')}
            cta={t('dashboard.service.sos.cta')}
          />
        </div>

        {/* Specialized ecosystems, ported from the mobile app. */}
        <div className="col-span-12">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-ink-subtle">
            {t('dashboard.ecosystems.title')}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { domain: 'pregnancy', Icon: Baby },
              { domain: 'children', Icon: Smile },
              { domain: 'allergy', Icon: Flower2 },
              { domain: 'medications', Icon: Pill },
            ].map(({ domain, Icon }) => (
              <Card key={domain} className="group relative overflow-hidden p-6 text-left transition-all hover:-translate-y-1 hover:shadow-card-hover">
                <button onClick={() => navigate(`/${domain}`)} className="absolute inset-0 z-10 cursor-pointer" aria-label={t(`domain.${domain}.title`)}>
                  <span className="sr-only">{t(`domain.${domain}.title`)}</span>
                </button>
                <div className="relative">
                  <div className="brand-gradient mb-4 flex h-12 w-12 items-center justify-center rounded-ui-md text-white shadow-card transition-transform duration-300 group-hover:scale-110">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-lg font-black tracking-tight text-ink">{t(`domain.${domain}.title`)}</h3>
                  <p className="line-clamp-2 text-xs font-medium leading-relaxed text-ink-muted">{t(`domain.${domain}.description`)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <aside className="col-span-12 space-y-6 lg:col-span-4">
          <Card className="overflow-hidden p-0!">
            <CardHeader className="mb-0 flex-row items-center justify-between border-b border-line bg-surface/40 px-6 py-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-subtle">{t('dashboard.identity.title')}</h3>
              <Link
                to="/settings"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-muted transition-all hover:border-primary hover:text-primary"
              >
                <Settings size={12} aria-hidden="true" />
                <span className="sr-only">{t('dashboard.identity.edit')}</span>
              </Link>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-ui-md p-4">
                  <MicroLabel className="mb-1">{t('dashboard.identity.bloodGroup')}</MicroLabel>
                  {/* `text-ink`, not `text-emergency`: a blood group is a stable
                      lab value, not a severity state. */}
                  <span className="font-mono text-2xl font-black tracking-tighter text-ink">
                    {user?.profile?.bloodType ? tValue(user.profile.bloodType, 'blood', lang) : '--'}
                  </span>
                </div>
                <div className="glass rounded-ui-md p-4">
                  <MicroLabel className="mb-1">{t('dashboard.identity.bmi')}</MicroLabel>
                  <span className="font-mono text-2xl font-black tracking-tighter text-ink">
                    {(() => {
                      const w = Number(user?.profile?.weight);
                      const h = Number(user?.profile?.height);
                      if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return '--';
                      return (w / Math.pow(h / 100, 2)).toFixed(1);
                    })()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-subtle">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary" />
                  {t('dashboard.identity.chronic')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {user?.profile?.chronicDiseases
                    ?.split(',')
                    .map((d) => d.trim())
                    .filter((d) => d !== '' && !isEmptyValue(d))
                    .map((d, i) => (
                      <span key={i} className="glass rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight text-ink-subtle">
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
            </CardContent>

            <CardFooter className="mt-0 items-center justify-between bg-hero px-6 py-4 text-on-hero">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase leading-none tracking-widest text-on-hero-muted">{t('dashboard.identity.lastUpdated')}</span>
                <span className="mt-1 font-mono text-[10px] font-bold leading-none">
                  {user?.profile?.updatedAt
                    ? new Date(user.profile.updatedAt).toLocaleDateString(HTML_LANG[lang] || lang)
                    : t('dashboard.identity.notSaved')}
                </span>
              </div>
              <ShieldAlert size={16} className="text-on-hero-accent opacity-50" aria-hidden="true" />
            </CardFooter>
          </Card>

          <div className="brand-gradient rounded-ui-xl p-6 text-white shadow-card-hover">
            <MicroLabel className="text-white/70!">{t('dashboard.hospital.title')}</MicroLabel>
            <p className="mt-2 font-bold leading-tight">{user?.profile?.preferredHospital || t('dashboard.hospital.none')}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="font-mono text-[10px] text-white/70">
                {(() => {
                  // Both coordinates are tested: the backend writes them
                  // independently, so latitude can be set while longitude is
                  // null, and `.toFixed` on null crashed the dashboard.
                  const lat = Number(user?.profile?.latitude);
                  const lng = Number(user?.profile?.longitude);
                  const has = Number.isFinite(lat) && Number.isFinite(lng) && user?.profile?.latitude != null && user?.profile?.longitude != null;
                  return has ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : t('dashboard.hospital.notSet');
                })()}
              </div>
              <MapPin size={14} className="text-white/70" aria-hidden="true" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
