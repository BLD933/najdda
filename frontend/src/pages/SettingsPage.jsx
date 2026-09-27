import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import profileService from '../features/auth/services/profileService';
import {
  ArrowLeft, Save, User, Phone, Droplets,
  Activity, Loader2, CheckCircle2, AlertCircle, Volume2
} from 'lucide-react';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { tValue, isEmptyValue } from '../features/i18n/valueLabels';

const SettingsPage = () => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [constants, setConstants] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);
  const [readAloud, setReadAloud] = useState(() => localStorage.getItem('najdda-tts-enabled') === 'true');

  const [formData, setFormData] = useState({
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    country: 'Morocco',
    city: '',
    preferredLanguage: 'Arabic',
    weight: '',
    height: '',
    isPregnant: false,
    drugAllergies: [],
    foodAllergies: [],
    smokingStatus: 'Non-smoker',
    alcoholStatus: 'Never',
    insuranceType: 'None / Self-Pay',
    chronicDiseases: [],
    medications: [],
    preferredHospital: '',
    emergencyContacts: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const consts = await profileService.getConstants();
        setConstants(consts);

        if (user?.profile) {
          setFormData({
            phoneNumber: user.profile.phoneNumber || '',
            dateOfBirth: user.profile.dateOfBirth?.split('T')[0] || '',
            gender: user.profile.gender || '',
            bloodType: user.profile.bloodType || '',
            country: user.profile.country || 'Morocco',
            city: user.profile.city || '',
            preferredLanguage: user.profile.preferredLanguage || 'Arabic',
            weight: user.profile.weight || '',
            height: user.profile.height || '',
            isPregnant: user.profile.isPregnant || false,
            drugAllergies: user.profile.drugAllergies?.split(', ') || ['None'],
            foodAllergies: user.profile.foodAllergies?.split(', ') || ['None'],
            smokingStatus: user.profile.smokingStatus || 'Non-smoker',
            alcoholStatus: user.profile.alcoholStatus || 'Never',
            insuranceType: user.profile.insuranceType || 'None / Self-Pay',
            // The backend stores bare 'None' for a profile that skipped the
            // wizard, while the chip list's empty value is 'None (Healthy)'.
            // Normalizing here makes the "Aucune" chip come up checked for a
            // healthy profile instead of leaving every chip unchecked.
            chronicDiseases: (isEmptyValue(user.profile.chronicDiseases)
              ? ['None (Healthy)']
              : user.profile.chronicDiseases.split(', ')),
            medications: user.profile.medications || [],
            preferredHospital: user.profile.preferredHospital || '',
            emergencyContacts: user.profile.emergencyContacts || [{ name: '', relationship: '', phone: '' }]
          });
        }
      } catch (err) {
        setError(t('settings.error.load'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, t]);

  // Reuse logic from wizard
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setSuccess(false);
  };

  const handleMultiSelect = (field, value) => {
    setSuccess(false);
    setFormData(prev => {
      const current = prev[field];
      // `isEmptyValue` replaces a former `value.includes('None')` substring
      // test. It covered both sentinels, but it would also match any future
      // enum containing the letters "None" — and the empty test is the one
      // place a false positive silently discards a real selection.
      if (isEmptyValue(value)) return { ...prev, [field]: [value] };
      let updated = current.filter(v => !isEmptyValue(v));
      if (updated.includes(value)) {
        updated = updated.filter(v => v !== value);
      } else {
        updated = [...updated, value];
      }
      if (updated.length === 0) {
        updated = [field === 'chronicDiseases' ? 'None (Healthy)' : 'None'];
      }
      return { ...prev, [field]: updated };
    });
  };

  const handleContactChange = (index, field, value) => {
    setSuccess(false);
    setFormData(prev => ({
      ...prev,
      // Replace the contact object rather than mutating it. `[...array]` is a
      // shallow copy: writing through it edited the ORIGINAL object, so React
      // saw the same reference and the row could fail to repaint.
      emergencyContacts: prev.emergencyContacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c),
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', relationship: '', phone: '' }]
    }));
  };

  // Medication logic
  useEffect(() => {
    if (medicationSearch.length < 3) {
      setMedicationResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingMed(true);
      try {
        const res = await fetch(`https://medicament-api.vercel.app/api/medicaments/search?keyword=${medicationSearch}`);
        const data = await res.json();
        setMedicationResults(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (err) { console.error(err); } finally { setSearchingMed(false); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [medicationSearch]);

  const addMedication = (med) => {
    if (!formData.medications.find(m => m.id === med.id)) {
      setFormData(prev => ({ ...prev, medications: [...prev.medications, { ...med, frequency: 'Once a day' }] }));
    }
    setMedicationSearch('');
    setMedicationResults([]);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        weight: parseInt(formData.weight),
        height: parseInt(formData.height)
      };
      await profileService.updateProfile(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('settings.error.update'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <Loader2 className="animate-spin text-primary" size={40} aria-hidden="true" />
      <span className="sr-only">{t('settings.loading')}</span>
    </div>
  );

  // Shared field styling. `line-strong` is a real 1.4.11 boundary — it clears
  // 4.5:1 against the card, so the field is identifiable without relying on its
  // fill. `focus-visible:outline-none` (not `focus:`) restores the global 2px
  // ring on keyboard focus; a bare `focus:outline-none` outranks it and left a
  // 1px border-colour change as the only focus cue, which 2.4.11 rejects.
  const field =
    'w-full rounded-ui-sm border border-line-strong bg-surface px-3 py-3 text-ink transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none';
  const label = 'text-sm font-medium text-ink-muted';

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="sticky top-0 z-sticky flex items-center gap-4 border-b border-line bg-surface px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink" aria-label={t('wizard.backToDashboard')}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-xl font-bold">{t('settings.title')}</h1>
        <LanguageSwitcher />
        <ThemeToggle />
      </nav>

      {/* The page bottom-padding has to clear the fixed save bar (96px) or the
          last card — Emergency Contacts — ends up underneath it. */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 px-6 pb-32 pt-6">
        <div aria-live="polite">
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-ui-md border border-success/40 bg-success-subtle p-4 text-on-success-subtle">
              <CheckCircle2 size={20} aria-hidden="true" />
              <span className="font-medium">{t('settings.saved')}</span>
            </div>
          )}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-ui-md border border-emergency/40 bg-emergency-subtle p-4 text-on-emergency-subtle">
              <AlertCircle size={20} aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* SECTION: Identity */}
        <section className="space-y-6 rounded-ui-lg border border-line bg-surface p-8 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><User className="text-primary" size={20} aria-hidden="true" /> {t('settings.identity.heading')}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className={label}>{t('settings.identity.fullName')}</label>
              <input id="fullName" disabled value={user?.fullName} readOnly className={`${field} cursor-not-allowed bg-surface-2 text-ink-subtle`} />
            </div>
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className={label}>{t('settings.identity.phone')}</label>
              <input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={field} />
            </div>
            <div className="space-y-2">
              <label htmlFor="country" className={label}>{t('settings.identity.country')}</label>
              <select id="country" name="country" value={formData.country} onChange={handleChange} className={field}>
                {constants?.geography.COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="city" className={label}>{t('settings.identity.city')}</label>
              <input id="city" name="city" value={formData.city} onChange={handleChange} className={field} />
            </div>
            {/* The language the agent should ANSWER in — distinct from the UI
                locale set by the switcher in the nav bar. The value was
                already persisted; it just had no control. */}
            <div className="space-y-2">
              <label htmlFor="preferredLanguage" className={label}>{t('wizard.s1.preferredLanguage')}</label>
              <select id="preferredLanguage" name="preferredLanguage" aria-describedby="preferredLanguage-help" value={formData.preferredLanguage} onChange={handleChange} className={field}>
                {constants?.medical.LANGUAGES?.map(l => (
                  <option key={l} value={l}>{tValue(l, 'language', lang)}</option>
                ))}
              </select>
              <p id="preferredLanguage-help" className="text-xs text-ink-subtle">
                {t('wizard.s1.preferredLanguageHelp')}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: Medical Conditions */}
        <section className="space-y-6 rounded-ui-lg border border-line bg-surface p-8 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Activity className="text-primary" size={20} aria-hidden="true" /> {t('settings.conditions.heading')}</h2>
          <div role="group" aria-label={t('settings.conditions.group')} className="flex flex-wrap gap-2">
            {constants?.medical.CHRONIC_CONDITIONS.map(c => {
              const selected = formData.chronicDiseases.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => handleMultiSelect('chronicDiseases', c)}
                  className={`rounded-ui-sm border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-primary bg-primary-subtle font-bold text-on-primary-subtle'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {tValue(c, 'chronic', lang)}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION: Pharmacy */}
        <section className="space-y-6 rounded-ui-lg border border-line bg-surface p-8 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Droplets className="text-primary" size={20} aria-hidden="true" /> {t('settings.meds.heading')}</h2>
          <div className="relative">
            <label htmlFor="medication-search" className="sr-only">{t('settings.meds.searchLabel')}</label>
            <input
              id="medication-search"
              placeholder={t('settings.meds.searchPlaceholder')}
              value={medicationSearch}
              onChange={(e) => setMedicationSearch(e.target.value)}
              className={`${field} focus:border-primary`}
              role="combobox"
              aria-expanded={medicationResults.length > 0}
              aria-controls="medication-results"
              aria-autocomplete="list"
            />
            {searchingMed && <Loader2 className="absolute right-3 top-3 animate-spin text-primary" aria-hidden="true" />}
            {medicationResults.length > 0 && (
              <div id="medication-results" role="listbox" className="absolute z-dropdown mt-2 w-full overflow-hidden rounded-ui-sm border border-line bg-surface shadow-elevated">
                {medicationResults.map(m => (
                  <button key={m.id} type="button" role="option" aria-selected="false" onClick={() => addMedication(m)} className="w-full border-b border-line p-4 text-left transition-colors last:border-0 hover:bg-primary-subtle">
                    <p className="text-sm font-bold">{m.nom}</p>
                    <p className="text-xs text-ink-muted">{m.dosage1}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {formData.medications.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-ui-sm border border-line bg-surface-2 p-4">
                <div>
                  <p className="text-sm font-bold text-ink">{m.nom}</p>
                  <p className="text-xs text-ink-muted">{m.dosage1}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('settings.meds.confirmRemove', { name: m.nom }))) {
                      setFormData(p => ({ ...p, medications: p.medications.filter(x => x.id !== m.id) }));
                    }
                  }}
                  className="rounded-ui-sm px-2 py-1 text-xs font-bold text-emergency transition-colors hover:bg-emergency-subtle"
                >
                  {t('settings.meds.remove')}<span className="sr-only"> {m.nom}</span>
                </button>
              </div>
            ))}
            {formData.medications.length === 0 && (
              <p className="rounded-ui-sm border border-dashed border-line bg-surface-2 p-6 text-center text-sm text-ink-muted">
                {t('settings.meds.empty')}
              </p>
            )}
          </div>
        </section>

        {/* SECTION: Voice & Accessibility */}
        <section className="space-y-6 rounded-ui-lg border border-line bg-surface p-8 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Volume2 className="text-primary" size={20} aria-hidden="true" /> {t('settings.voice.heading')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{t('settings.voice.readAloud')}</p>
              <p className="text-xs text-ink-muted">{t('settings.voice.readAloudHelp')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={readAloud}
              onClick={() => {
                const next = !readAloud;
                setReadAloud(next);
                localStorage.setItem('najdda-tts-enabled', next ? 'true' : 'false');
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${readAloud ? 'bg-primary' : 'bg-surface-3'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${readAloud ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-ink-muted italic">{t('settings.voice.audioDisclaimer')}</p>
        </section>

        {/* SECTION: Emergency */}
        <section className="space-y-6 rounded-ui-lg border border-line bg-surface p-8 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Phone className="text-emergency" size={20} aria-hidden="true" /> {t('settings.emergency.heading')}</h2>
            <button type="button" onClick={addContact} className="rounded-ui-sm px-2 py-1 text-sm font-bold text-primary transition-colors hover:bg-primary-subtle">
              {t('settings.emergency.addContact')}
            </button>
          </div>
          <div className="space-y-4">
            {formData.emergencyContacts.map((c, i) => (
              <div key={i} className="grid grid-cols-1 gap-4 rounded-ui-md border border-line bg-surface-2 p-4 md:grid-cols-3">
                <input aria-label={t('contacts.nameOf', { n: i + 1 })} placeholder={t('contacts.name')} value={c.name} onChange={(e) => handleContactChange(i, 'name', e.target.value)} className={field} />
                <select aria-label={t('contacts.relationshipOf', { n: i + 1 })} value={c.relationship} onChange={(e) => handleContactChange(i, 'relationship', e.target.value)} className={field}>
                  <option value="">{t('contacts.relationship')}</option>
                  {constants?.medical.RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{tValue(r, 'relationship', lang)}</option>
                  ))}
                </select>
                <input aria-label={t('contacts.phoneOf', { n: i + 1 })} placeholder={t('contacts.phone')} type="tel" value={c.phone} onChange={(e) => handleContactChange(i, 'phone', e.target.value)} className={field} />
              </div>
            ))}
          </div>
        </section>

        {/* Save bar. z-modal, not z-sticky: nothing may sit over a primary action. */}
        <div className="fixed inset-x-0 bottom-0 z-modal flex justify-center border-t border-line bg-surface p-6 shadow-elevated">
          <button
            type="submit"
            disabled={saving}
            className="flex w-full max-w-xl items-center justify-center gap-2 rounded-ui-md bg-primary py-4 font-bold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
