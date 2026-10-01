import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, ShieldAlert, Navigation, X, HeartPulse, Droplets, LifeBuoy } from 'lucide-react';
import DirIcon from '../components/ui/dir-icon';
import { useAuth } from '../features/auth/context/AuthContext';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { getEmergencyNumber } from '../utils/emergency';



/* Emergency SOS page ported from the mobile app: pulsing SOS button with
   confirm → geolocation + maps link + direct dial, real profile contacts,
   first-aid cards. The red stays solid — urgency must never be missed. */
export default function EmergencyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const country = user?.profile?.country || 'Morocco';
  const emergencyNumber = getEmergencyNumber(country);
  const [active, setActive] = useState(false);
  const [coords, setCoords] = useState(
    user?.profile?.latitude && user?.profile?.longitude
      ? { lat: user.profile.latitude, lng: user.profile.longitude }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const contacts = Array.isArray(user?.profile?.emergencyContacts)
    ? user.profile.emergencyContacts.filter((c) => c?.name || c?.phone)
    : [];

  const mapsLink = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocError(t('emergency.geoUnsupported'));
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError(t('emergency.geoDenied'));
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const triggerSOS = () => {
    if (window.confirm(t('emergency.confirm'))) {
      setActive(true);
      if (!coords) locate();
    }
  };

  const steps = [
    { Icon: HeartPulse, title: t('emergency.step1Title'), desc: t('emergency.step1Desc') },
    { Icon: Droplets, title: t('emergency.step2Title'), desc: t('emergency.step2Desc') },
    { Icon: LifeBuoy, title: t('emergency.step3Title'), desc: t('emergency.step3Desc') },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div aria-hidden="true" className="aurora" />
      <header className="glass-nav z-sticky flex items-center gap-4 px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:text-ink" aria-label={t('chat.backToDashboard')}>
          <DirIcon name={ArrowLeft} size={24} aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <ShieldAlert size={20} className="text-emergency" aria-hidden="true" />
          <h1 className="text-lg font-black tracking-tight">{t('emergency.title')}</h1>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-4 py-1.5">
          <span aria-hidden="true" className={`h-2 w-2 animate-pulse rounded-full ${active ? 'bg-emergency' : 'bg-success'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            {active ? t('emergency.active') : t('emergency.standby')}
          </span>
        </div>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {/* SOS button with pulse rings (CSS, disabled under reduced-motion). */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-emergency/30 [animation-duration:2s]" />
            {/* No preventDefault: the anchor's own `tel:` navigation is the
                most reliable way to place the call (window.open is blocked on
                iOS Safari and by pop-up blockers). The confirm runs first; if
                the patient cancels, this second click is the retry. */}
            <a
              href={`tel:${emergencyNumber}`}
              onClick={() => { if (!active) triggerSOS(); }}
              className="relative flex h-48 w-48 flex-col items-center justify-center rounded-full bg-emergency text-on-emergency shadow-card-hover transition-transform hover:scale-105"
              aria-label={t('emergency.callNow', { number: emergencyNumber })}
            >
              <span className="text-4xl font-black tracking-tight">SOS</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                <Phone size={14} aria-hidden="true" /> {emergencyNumber}
              </span>
            </a>
          </div>
          <p className="max-w-sm text-center text-sm text-ink-muted">{t('emergency.hint')}</p>
          {active && (
            <button
              onClick={() => { if (window.confirm(t('emergency.cancelConfirm'))) setActive(false); }}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest text-ink-muted transition-colors hover:text-emergency"
            >
              <X size={14} aria-hidden="true" /> {t('emergency.cancel')}
            </button>
          )}
        </div>

        {/* Location card */}
        <div className="glass rounded-ui-xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-ink-subtle">
            <MapPin size={16} aria-hidden="true" /> {t('emergency.locationTitle')}
          </h2>
          {coords ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-sm text-ink">
                {Number(coords.lat).toFixed(4)}, {Number(coords.lng).toFixed(4)}
              </span>
              <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-black uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-hover">
                <Navigation size={14} aria-hidden="true" /> {t('emergency.openMaps')}
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-muted">{t('emergency.noLocation')}</span>
              <button onClick={locate} disabled={locating} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-black uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50">
                <Navigation size={14} aria-hidden="true" /> {locating ? t('emergency.locating') : t('emergency.shareLocation')}
              </button>
            </div>
          )}
          {locError && <p role="alert" className="mt-3 text-sm text-on-emergency-subtle">{locError}</p>}
        </div>

        {/* Real profile contacts — never fictive. */}
        <div className="glass rounded-ui-xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-ink-subtle">{t('contacts.heading')}</h2>
            <Link to="/settings" className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary-hover">
              {t('emergency.manageContacts')}
            </Link>
          </div>
          {contacts.length > 0 ? (
            <ul className="space-y-3">
              {contacts.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-ui-md border border-line bg-surface/60 px-4 py-3">
                  <div>
                    <p className="font-bold text-ink">{c.name || t('contacts.row', { n: i + 1 })}</p>
                    {c.relationship && <p className="text-xs text-ink-muted">{c.relationship}</p>}
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-4 py-2 text-xs font-black text-on-success-subtle transition-transform hover:scale-105" aria-label={`${t('chat.call', { number: c.phone })} — ${c.name}`}>
                      <Phone size={14} aria-hidden="true" /> {c.phone}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-ink-muted">{t('emergency.noContacts')}</p>
          )}
        </div>

        {/* First aid */}
        <div>
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-ink-subtle">{t('emergency.firstAidTitle')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map(({ Icon, title, desc }, i) => (
              <div key={i} className="glass rounded-ui-lg p-5">
                <span className="mb-3 inline-block rounded-full bg-emergency-subtle px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-emergency-subtle">
                  {t('emergency.step', { n: i + 1 })}
                </span>
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={18} className="text-emergency" aria-hidden="true" />
                  <h3 className="font-black text-ink">{title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
