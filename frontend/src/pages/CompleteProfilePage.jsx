import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import profileService from '../features/auth/services/profileService';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';
import { useTranslation } from '../features/i18n/I18nContext';
import { tValue, isEmptyValue } from '../features/i18n/valueLabels';
import { readStore, writeStore, removeStore } from '../utils/storage';
import { User, Phone, MapPin, Droplets, Activity, Loader2, Save, Plus, X, Check, Navigation, ArrowLeft } from 'lucide-react';
import DirIcon from '../components/ui/dir-icon';

// Step names are KEYS, not strings, and they live at module scope so the
// stepper below cannot drift out of sync with `totalSteps`. They are resolved
// through `t()` at render time, NOT at module load — a module-scope `t()` would
// freeze the label to whatever language was active on first import and it would
// never change when the user switches.
const STEPS = [
  'wizard.step.identity',
  'wizard.step.vitals',
  'wizard.step.medical',
  'wizard.step.pharmacy',
  'wizard.step.logistics',
];

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  // Without this the wizard saved the profile but never told AuthContext, so
  // ProtectedRoute still saw the incomplete profile and bounced the patient
  // back to step 1 — with the draft already deleted, i.e. an empty form.
  const { refreshUser } = useAuth();
  const { t, lang } = useTranslation();
  const liveRegion = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [constants, setConstants] = useState(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const draft = readStore('najdda_profile_draft');
      const n = draft ? JSON.parse(draft).currentStep : 1;
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1;
    } catch {
      return 1;
    }
  });
  const totalSteps = 5;

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [isManualHospital, setIsManualHospital] = useState(false);
  const [locatingGeo, setLocatingGeo] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalSearchResults, setHospitalSearchResults] = useState([]);
  const [searchingHospitalName, setSearchingHospitalName] = useState(false);

  const [formData, setFormData] = useState(() => {
    const defaults = {
      countryCode: '+212',
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
      drugAllergies: ['None'],
      foodAllergies: ['None'],
      smokingStatus: 'Non-smoker',
      alcoholStatus: 'Never',
      insuranceType: 'None / Self-Pay',
      chronicDiseases: ['None (Healthy)'],
      medications: [],
      preferredHospital: '',
      latitude: null,
      longitude: null,
      emergencyContacts: [{ name: '', relationship: '', phone: '' }]
    };
    try {
      const draft = readStore('najdda_profile_draft');
      if (draft) {
        const parsed = JSON.parse(draft).formData || {};
        return {
          ...defaults,
          ...parsed,
          medications: Array.isArray(parsed.medications) ? parsed.medications : [],
          drugAllergies: Array.isArray(parsed.drugAllergies) ? parsed.drugAllergies : defaults.drugAllergies,
          emergencyContacts: Array.isArray(parsed.emergencyContacts) && parsed.emergencyContacts.length > 0 ? parsed.emergencyContacts : defaults.emergencyContacts,
        };
      }
    } catch {
      /* draft corrompu : repartir des défauts */
    }
    return {
      countryCode: '+212',
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
      drugAllergies: ['None'],
      foodAllergies: ['None'],
      smokingStatus: 'Non-smoker',
      alcoholStatus: 'Never',
      insuranceType: 'None / Self-Pay',
      chronicDiseases: ['None (Healthy)'],
      medications: [],
      preferredHospital: '',
      latitude: null,
      longitude: null,
      emergencyContacts: [{ name: '', relationship: '', phone: '' }]
    };
  });

  // Persistence Logic
  useEffect(() => {
    writeStore('najdda_profile_draft', JSON.stringify({ formData, currentStep, isManualHospital }));
  }, [formData, currentStep, isManualHospital]);

  // Auto-load hospitals when user reaches Step 5. The load happens ONCE per
  // city: the guards live inside the effect rather than in the dep array,
  // because listing `formData.city` as a dep re-fetched the list on every
  // keystroke of any other field that shares the form.
  const loadedCityRef = useRef(null);
  useEffect(() => {
    if (currentStep !== 5 || !formData.city) return;
    if (loadedCityRef.current === formData.city || nearbyHospitals.length > 0) return;
    loadedCityRef.current = formData.city;
    fetchHospitalsByCity(formData.city);
  }, [currentStep, formData.city, nearbyHospitals.length]);

  // Hospital search by name within the city
  useEffect(() => {
    if (hospitalSearch.length < 2) {
      setHospitalSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingHospitalName(true);
      try {
        const cityQuery = formData.city ? `, ${formData.city}` : '';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hospitalSearch + ' hospital' + cityQuery)}&format=json&limit=7`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const results = Array.isArray(data)
          ? data.map((p, i) => ({
              id: p.place_id || i,
              name: p.display_name.split(',')[0],
              address: p.display_name.split(',').slice(1, 3).join(',').trim()
            }))
          : [];
        setHospitalSearchResults(results);
      } catch (err) {
        console.error('Hospital name search error:', err);
      } finally {
        setSearchingHospitalName(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [hospitalSearch, formData.city]);



  // Medication API Logic
  useEffect(() => {
    const searchMeds = async () => {
      if (medicationSearch.length < 3) {
        setMedicationResults([]);
        return;
      }
      setSearchingMed(true);
      try {
        // Using the /api/medicaments/search endpoint with the 'keyword' parameter
        const res = await fetch(`https://medicament-api.vercel.app/api/medicaments/search?keyword=${encodeURIComponent(medicationSearch)}`);
        const data = await res.json();

        // The API returns an array directly for the search endpoint
        setMedicationResults(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (err) {
        console.error('Medication API error:', err);
      } finally {
        setSearchingMed(false);
      }
    };

    const timeoutId = setTimeout(searchMeds, 500);
    return () => clearTimeout(timeoutId);
  }, [medicationSearch]);

  const addMedication = (med) => {
    if (!formData.medications.find(m => m.id === med.id)) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, { ...med, frequency: 'Once a day' }]
      }));
    }
    setMedicationSearch('');
    setMedicationResults([]);
  };

  const removeMedication = (id) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id)
    }));
  };

  // A geolocation call with no error callback and no timeout: a denied
  // permission or a silent timeout left the button reading "save my location"
  // forever with nothing happening, and no message explaining why.
  const handleGPS = () => {
    if (!('geolocation' in navigator)) {
      setError(t('emergency.geoUnsupported'));
      return;
    }
    setLocatingGeo(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setLocatingGeo(false);
      },
      () => {
        setError(t('emergency.geoDenied'));
        setLocatingGeo(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const fetchHospitalsByCity = async (city) => {
    setSearchingHospitals(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=hospital+${encodeURIComponent(city)}&format=json&limit=15`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      const hospitals = Array.isArray(data)
        ? data
            .filter(p => p.display_name)
            .map((p, i) => ({
              id: p.place_id || i,
              name: p.display_name.split(',')[0],
              address: p.display_name.split(',').slice(1, 3).join(',').trim()
            }))
        : [];

      setNearbyHospitals(hospitals);
    } catch (err) {
      console.error('Hospital city search error:', err);
    } finally {
      setSearchingHospitals(false);
    }
  };

  // The options are fetched ONCE — this must not re-run on a language switch.
  // `t` is read through a ref rather than added to the deps: the message is
  // written into `error` at the moment of failure, and re-fetching the whole
  // constant list just to re-spell one string would be wasteful and would
  // re-open the loading gate.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await profileService.getConstants();
        setConstants(data);
      } catch {
        setError(tRef.current('wizard.error.constants'));
      } finally {
        setLoading(false);
      }
    };
    fetchConstants();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // If user selects "Enter manually", we'll switch to a text input
    if (name === 'preferredHospital' && value === 'Enter manually') {
      setIsManualHospital(true);
      setFormData(prev => ({ ...prev, preferredHospital: '' }));
    }
  };

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const current = prev[field];

      // If selecting 'None' or 'None (Healthy)', clear others.
      // `isEmptyValue` replaces a former `value.includes('None')` substring
      // test: it covered both sentinels, but would also match any future enum
      // containing the letters "None", and here a false positive would
      // silently discard a real selection.
      if (isEmptyValue(value)) {
        return { ...prev, [field]: [value] };
      }

      // If something else is selected, remove the empty sentinel
      let updated = current.filter(v => !isEmptyValue(v));

      if (updated.includes(value)) {
        updated = updated.filter(v => v !== value);
      } else {
        updated = [...updated, value];
      }

      // If empty, default to None
      if (updated.length === 0) {
        updated = [field === 'chronicDiseases' ? 'None (Healthy)' : 'None'];
      }

      return { ...prev, [field]: updated };
    });
  };

  const handleContactChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      // Replace the contact object rather than mutating it. `[...array]` is a
      // shallow copy: writing through it edited the ORIGINAL object, so React
      // saw an unchanged reference and the row could fail to repaint.
      emergencyContacts: prev.emergencyContacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c),
    }));
  };

  // Stable per-row id. `key={index}` on a removable list makes React reuse the
  // DOM of the row that took the removed one's place, so the inputs kept their
  // old text: removing the first row showed the second one's name in the first
  // row's box. The id is client-only and stripped before submit.
  const contactKey = (c, i) => c.__key ?? `c${i}`;

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { name: '', relationship: '', phone: '', __key: `c${Date.now()}` },
      ],
    }));
  };

  const removeContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
      }));
    }
  };

  // Announced on every step change. The stepper's active state is conveyed by
  // colour alone otherwise, which is not readable by a screen reader. `loading`
  // is a dependency because the region is not in the DOM while the profile is
  // being fetched — without it the first announcement is written to a node that
  // does not exist yet and the stepper opens completely silent. `t` is a
  // dependency for the same reason: the announcement must be re-spelled in the
  // new language when the user switches, not stay frozen in the old one.
  useEffect(() => {
    if (liveRegion.current) {
      liveRegion.current.textContent = t('wizard.stepOf', {
        current: currentStep,
        total: totalSteps,
        step: t(STEPS[currentStep - 1]),
      });
    }
  }, [currentStep, loading, t]);

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const validateStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!formData.phoneNumber || !formData.dateOfBirth || !formData.gender || !formData.city) {
        setError(t('wizard.error.identity'));
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.weight || !formData.height || !formData.bloodType) {
        setError(t('wizard.error.vitals'));
        return false;
      }
      // The backend silently coerces out-of-range numbers to NULL
      // (toNum(weight, 20, 300) / toNum(height, 50, 250)) and still answers
      // 200, so a patient typing 1.75 metres got a saved profile with a null
      // height — which the profile guard then treats as "incomplete" and
      // bounces back to this wizard with the draft already gone. Reject here.
      const w = Number(formData.weight);
      const h = Number(formData.height);
      if (!Number.isFinite(w) || w < 20 || w > 300) {
        setError(t('wizard.error.weightRange'));
        return false;
      }
      if (!Number.isFinite(h) || h < 50 || h > 250) {
        setError(t('wizard.error.heightRange'));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const fullPhoneNumber = `${formData.countryCode} ${formData.phoneNumber}`;

      // Clean the payload
      const toNum = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const payload = {
        ...formData,
        phoneNumber: fullPhoneNumber,
        weight: toNum(formData.weight),
        height: toNum(formData.height),
      };

      // Remove internal frontend-only fields
      delete payload.countryCode;
      // `__key` is a client-only React key; persisting it would add a column
      // the profile table does not have.
      payload.emergencyContacts = (payload.emergencyContacts || []).map(({ __key, ...c }) => c);

      await profileService.updateProfile(payload);
      removeStore('najdda_profile_draft');
      // Refresh the shared auth state BEFORE navigating, otherwise the guard
      // reads the stale incomplete profile and re-renders this wizard.
      try { await refreshUser?.(); } catch { /* ignore */ }
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.message || t('wizard.error.update');
      const missing = err.response?.data?.missingFields;
      setError(missing ? `${errMsg}: ${missing.join(', ')}` : errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Shared field styling, identical to SettingsPage. `line-strong` is a real
  // 1.4.11 boundary: it clears 4.5:1 against the card, so the field is
  // identifiable without relying on its fill. `focus-visible:outline-none` (not
  // `focus:`) restores the global 2px ring on keyboard focus — a bare
  // `focus:outline-none` outranks the `:where()` rule and erased it.
  // Split into base + `w-full` so the split phone row below can size its two
  // halves by flex instead: `w-full` in the shared string would beat both
  // `w-1/3` and `flex-1` and crush the number input to a sliver.
  const fieldBase =
    'rounded-ui-sm border border-line-strong bg-surface/70 px-3 py-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none';
  const field = `${fieldBase} w-full`;
  const label = 'text-sm font-medium text-ink-muted';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="animate-spin text-primary" size={40} aria-hidden="true" />
        <span className="sr-only">{t('wizard.loading')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div aria-hidden="true" className="aurora" />
      <nav className="glass-nav sticky top-0 z-sticky flex items-center gap-4 px-6 py-4">
        <button onClick={() => navigate('/dashboard')} className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink" aria-label={t('wizard.backToDashboard')}>
          <DirIcon name={ArrowLeft} size={20} aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-xl font-bold">{t('wizard.title')}</h1>
        <LanguageSwitcher />
        <ThemeToggle />
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Step announcement. The stepper conveys its state by colour alone,
            which a screen reader cannot see, so the move is announced. */}
        <p ref={liveRegion} role="status" aria-live="polite" className="sr-only" />

        {/* Progress Stepper. Aria-hidden because the live region above carries
            the same information in a form assistive tech can read. */}
        <ol className="mb-8 flex items-start px-4" aria-hidden="true">
          {STEPS.map((key, i) => {
            const step = i + 1;
            const done = currentStep > step;
            const active = currentStep === step;
            return (
              <li key={key} className="relative flex flex-1 flex-col items-center">
                <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                  done
                    ? 'bg-success text-on-primary shadow-card'
                    : active
                      ? 'brand-gradient text-white shadow-card-hover ring-2 ring-primary/40 ring-offset-2 ring-offset-canvas'
                      : 'glass text-ink-subtle'
                }`}>
                  {done ? <Check size={18} strokeWidth={3} /> : step}
                </div>
                <span className={`mt-2 text-center text-xs font-medium ${
                  active ? 'text-primary' : done ? 'text-ink-muted' : 'text-ink-subtle'
                }`}>
                  {t(key)}
                </span>
                {step < totalSteps && (
                  <div className={`absolute start-1/2 top-5 h-0.5 w-full ${done ? 'bg-success' : 'bg-line'}`} />
                )}
              </li>
            );
          })}
        </ol>

        <div className="glass-strong overflow-hidden rounded-ui-xl">
          {/* Brand gradient step header: white text only, both themes. */}
          <div className="brand-gradient relative flex items-center justify-between overflow-hidden px-8 py-6">
            <div aria-hidden="true" className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/15 blur-[60px]" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white">{t(STEPS[currentStep - 1])}</h2>
              <p className="mt-1 text-white/75">{t('wizard.heroStepOf', { current: currentStep, total: totalSteps })}</p>
            </div>
            <Activity size={32} className="relative text-white/70" aria-hidden="true" />
          </div>

          <div className="p-8">
            <div aria-live="assertive">
              {error && (
                <div className="glass mb-6 rounded-ui-md border-emergency/50 p-4 text-on-emergency-subtle">
                  {error}
                </div>
              )}
            </div>

            {/* Step 1: Identity & Location */}
            {currentStep === 1 && (
              <section className="space-y-6">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink">
                  <User className="text-primary" size={24} aria-hidden="true" /> {t('wizard.s1.heading')}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="cp-countryCode" className={label}>{t('wizard.s1.phone')}</label>
                    <div className="flex gap-2">
                      <select id="cp-countryCode" name="countryCode" value={formData.countryCode} onChange={handleChange} className={`${fieldBase} w-1/4 shrink-0 sm:w-1/3`}>
                        {(constants?.geography.COUNTRY_CODES || []).map(c => (
                          <option key={c.code} value={c.code}>{c.country} ({c.code})</option>
                        ))}
                      </select>
                      <input id="cp-phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                        className={`${fieldBase} min-w-0 flex-1`} placeholder={t('wizard.s1.phonePlaceholder')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-dob" className={label}>{t('wizard.s1.dob')}</label>
                    <input id="cp-dob" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={field} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-gender" className={label}>{t('wizard.s1.gender')}</label>
                    <select id="cp-gender" name="gender" value={formData.gender} onChange={handleChange} className={field}>
                      <option value="">{t('wizard.s1.select')}</option>
                      {(constants?.medical.GENDERS || []).map(g => (
                      <option key={g} value={g}>{tValue(g, 'gender', lang)}</option>
                    ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-country" className={label}>{t('wizard.s1.country')}</label>
                    <select id="cp-country" name="country" value={formData.country} onChange={handleChange} className={field}>
                      {(constants?.geography.COUNTRIES || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-city" className={label}>{t('wizard.s1.city')}</label>
                    {formData.country === 'Morocco' ? (
                      <select id="cp-city" name="city" value={formData.city} onChange={handleChange} className={field}>
                        <option value="">{t('wizard.s1.selectCity')}</option>
                        {(constants?.geography.MOROCCAN_CITIES || []).map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    ) : (
                      <input id="cp-city" type="text" name="city" value={formData.city} onChange={handleChange} className={field} />
                    )}
                  </div>
                  {/* `preferredLanguage` was already carried in formData and
                      saved to the profile, but no control ever set it — the
                      value silently kept its backend default of 'Arabic'. The
                      enum already exists in the API (LANGUAGES), so this only
                      surfaces what the model can already store. Note this is
                      the language the AGENT should answer in, which is
                      independent of the UI locale switched in the nav bar. */}
                  <div className="space-y-2">
                    <label htmlFor="cp-preferredLanguage" className={label}>{t('wizard.s1.preferredLanguage')}</label>
                    <select id="cp-preferredLanguage" name="preferredLanguage" aria-describedby="cp-preferredLanguage-help" value={formData.preferredLanguage} onChange={handleChange} className={field}>
                      {constants?.medical.LANGUAGES?.map(l => (
                        <option key={l} value={l}>{tValue(l, 'language', lang)}</option>
                      ))}
                    </select>
                    <p id="cp-preferredLanguage-help" className="text-xs text-ink-subtle">
                      {t('wizard.s1.preferredLanguageHelp')}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Step 2: Physical Vitals & Lifestyle */}
            {currentStep === 2 && (
              <section className="space-y-8">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink">
                  <Activity className="text-primary" size={24} aria-hidden="true" /> {t('wizard.s2.heading')}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="cp-weight" className={label}>{t('wizard.s2.weight')}</label>
                    <input id="cp-weight" type="number" name="weight" min="20" max="300" step="0.1" value={formData.weight} onChange={handleChange} className={field} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-height" className={label}>{t('wizard.s2.height')}</label>
                    <input id="cp-height" type="number" name="height" min="50" max="250" step="0.1" value={formData.height} onChange={handleChange} className={field} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-bloodType" className={label}>{t('wizard.s2.bloodType')}</label>
                    <select id="cp-bloodType" name="bloodType" value={formData.bloodType} onChange={handleChange} className={field}>
                      <option value="">{t('wizard.s1.select')}</option>
                      {(constants?.medical.BLOOD_TYPES || []).map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cp-smoking" className={label}>{t('wizard.s2.smoking')}</label>
                    <select id="cp-smoking" name="smokingStatus" value={formData.smokingStatus} onChange={handleChange} className={field}>
                      {(constants?.medical.LIFESTYLE?.SMOKING || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cp-insurance" className={label}>{t('wizard.s2.insurance')}</label>
                    <select id="cp-insurance" name="insuranceType" value={formData.insuranceType} onChange={handleChange} className={field}>
                      {(constants?.medical.INSURANCE_MOROCCO || []).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Step 3: Medical & Allergies. The allergy group uses the emergency
                family while chronic conditions use primary: a drug allergy is
                the one selection here that must read as a safety flag, not as a
                preference chip. */}
            {currentStep === 3 && (
              <section className="space-y-8">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink">
                  <Droplets className="text-primary" size={24} aria-hidden="true" /> {t('wizard.s3.heading')}
                </h3>

                <div className="space-y-4">
                  <span id="cp-drug-allergies" className={`${label} block`}>{t('wizard.s3.drugAllergies')}</span>
                  <div role="group" aria-labelledby="cp-drug-allergies" className="flex flex-wrap gap-2">
                    {(constants?.medical.ALLERGIES?.DRUGS || []).map(allergy => {
                      const selected = formData.drugAllergies.includes(allergy);
                      return (
                        <button key={allergy} type="button" role="checkbox" aria-checked={selected}
                          onClick={() => handleMultiSelect('drugAllergies', allergy)}
                          className={`rounded-ui-sm border px-4 py-2 text-sm transition-colors ${
                            selected
                              ? 'border-emergency bg-emergency-subtle font-bold text-on-emergency-subtle'
                              : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                          }`}>{allergy}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <span id="cp-chronic" className={`${label} block`}>{t('wizard.s3.chronic')}</span>
                  <div role="group" aria-labelledby="cp-chronic" className="flex flex-wrap gap-2">
                    {(constants?.medical.CHRONIC_CONDITIONS || []).map(c => {
                      const selected = formData.chronicDiseases.includes(c);
                      return (
                        <button key={c} type="button" role="checkbox" aria-checked={selected}
                          onClick={() => handleMultiSelect('chronicDiseases', c)}
                          className={`rounded-ui-sm border px-4 py-2 text-sm transition-colors ${
                            selected
                              ? 'border-primary bg-primary-subtle font-bold text-on-primary-subtle'
                              : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                          }`}>{tValue(c, 'chronic', lang)}</button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Step 4: Pharmacy (New Medications API Step) */}
            {currentStep === 4 && (
              <section className="space-y-8">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink">
                  <Activity className="text-primary" size={24} aria-hidden="true" /> {t('wizard.s4.heading')}
                </h3>
                <div className="relative">
                  <label htmlFor="cp-med-search" className="sr-only">{t('wizard.s4.searchLabel')}</label>
                  <input
                    id="cp-med-search"
                    type="text"
                    placeholder={t('wizard.s4.searchPlaceholder')}
                    value={medicationSearch}
                    onChange={(e) => setMedicationSearch(e.target.value)}
                    className={field}
                  />
                  {searchingMed && <Loader2 className="absolute end-4 top-4 animate-spin text-primary" aria-hidden="true" />}

                  {medicationResults.length > 0 && (
                    <div className="absolute z-dropdown mt-2 w-full overflow-hidden rounded-ui-sm border border-line bg-surface shadow-elevated">
                      {medicationResults.map(med => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => addMedication(med)}
                          className="w-full border-b border-line p-4 text-left transition-colors last:border-0 hover:bg-primary-subtle"
                        >
                          <p className="font-bold text-ink">{med.nom}</p>
                          <p className="text-xs text-ink-muted">{med.forme} - {med.dosage1}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-ink-muted">{t('wizard.s4.yourMedications')}</h4>
                  {formData.medications.length === 0 ? (
                    <p className="text-sm text-ink-subtle">{t('wizard.s4.empty')}</p>
                  ) : (
                    formData.medications.map(med => (
                      <div key={med.id} className="flex items-center justify-between rounded-ui-md border border-line bg-surface-2 p-4">
                        <div>
                          <p className="font-bold text-ink">{med.nom}</p>
                          <p className="text-xs text-ink-muted">{med.dosage1}</p>
                        </div>
                        <button type="button" onClick={() => removeMedication(med.id)} className="rounded-ui-sm px-2 py-1 text-sm font-bold text-emergency transition-colors hover:bg-emergency-subtle">
                          {t('wizard.s4.remove')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Step 5: Logistics & Equipment */}
            {currentStep === 5 && (
              <section className="space-y-8">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink">
                  <MapPin className="text-primary" size={24} aria-hidden="true" /> {t('wizard.s5.heading')}
                </h3>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={label}>{t('wizard.s5.preferredHospital')}</span>
                    <span className="flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-1 text-xs font-medium text-on-primary-subtle">
                      <MapPin size={12} aria-hidden="true" /> {formData.city || t('wizard.s5.noCity')}
                    </span>
                  </div>

                  {/* Selected Hospital Badge */}
                  {formData.preferredHospital && (
                    <div className="flex items-center justify-between rounded-ui-md border border-success/40 bg-success-subtle p-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-on-success-subtle">
                        <Check size={16} aria-hidden="true" /> {formData.preferredHospital}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, preferredHospital: '' })); setHospitalSearch(''); }}
                        className="rounded-ui-sm px-2 py-1 text-xs font-bold text-emergency transition-colors hover:bg-emergency-subtle"
                      >
                        {t('wizard.s5.change')}
                      </button>
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <label htmlFor="cp-hospital-search" className="sr-only">{t('wizard.s5.searchLabel')}</label>
                    <input
                      id="cp-hospital-search"
                      type="text"
                      placeholder={t('wizard.s5.searchPlaceholder', {
                        city: formData.city || t('wizard.s5.searchFallbackCity'),
                      })}
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      className={field}
                    />
                    {(searchingHospitalName || searchingHospitals) && (
                      <Loader2 className="absolute end-3 top-3.5 animate-spin text-primary" size={18} aria-hidden="true" />
                    )}
                  </div>

                  {/* City-based preloaded results */}
                  {nearbyHospitals.length > 0 && !hospitalSearch && (
                    <div className="glass overflow-hidden rounded-ui-md">
                      <p className="border-b border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-ink-muted">
                        {t('wizard.s5.hospitalsIn', { city: formData.city })}
                      </p>
                      {nearbyHospitals.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, preferredHospital: h.name }));
                          }}
                          className="w-full border-b border-line p-3 text-left transition-colors last:border-0 hover:bg-primary-subtle"
                        >
                          <p className="text-sm font-semibold text-ink">{h.name}</p>
                          <p className="text-xs text-ink-muted">{h.address}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search results */}
                  {hospitalSearchResults.length > 0 && hospitalSearch && (
                    <div className="glass overflow-hidden rounded-ui-md">
                      {hospitalSearchResults.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, preferredHospital: h.name }));
                            setHospitalSearch('');
                            setHospitalSearchResults([]);
                          }}
                          className="w-full border-b border-line p-3 text-left transition-colors last:border-0 hover:bg-primary-subtle"
                        >
                          <p className="text-sm font-semibold text-ink">{h.name}</p>
                          <p className="text-xs text-ink-muted">{h.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4 rounded-ui-md bg-primary-subtle p-6">
                  <p className="text-center text-sm font-medium text-on-primary-subtle">{t('wizard.s5.gpsText')}</p>
                  <button type="button" onClick={handleGPS} disabled={locatingGeo} aria-busy={locatingGeo} className={`flex items-center gap-2 rounded-full px-6 py-2 font-bold transition-colors disabled:opacity-60 ${
                    formData.latitude != null
                      ? 'bg-success-subtle text-on-success-subtle'
                      : 'bg-primary text-on-primary hover:bg-primary-hover'
                  }`}>
                    {locatingGeo
                      ? <><Loader2 className="animate-spin" size={16} aria-hidden="true" /> {t('emergency.locating')}</>
                      : formData.latitude != null
                        ? <><Check size={16} aria-hidden="true" /> {t('wizard.s5.locationSaved')}</>
                        : <><Navigation size={16} aria-hidden="true" /> {t('wizard.s5.saveLocation')}</>}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-semibold text-ink">
                      <Phone className="text-emergency" size={20} aria-hidden="true" /> {t('contacts.heading')}
                    </h4>
                    <button type="button" onClick={addContact} className="flex items-center gap-1 rounded-ui-sm px-2 py-1 text-sm font-bold text-primary transition-colors hover:bg-primary-subtle">
                      <Plus size={16} aria-hidden="true" /> {t('contacts.add')}
                    </button>
                  </div>
                  {formData.emergencyContacts.map((contact, index) => (
                    <div key={contactKey(contact, index)} className="space-y-2 rounded-ui-md border border-line bg-surface-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{t('contacts.row', { n: index + 1 })}</span>
                        {formData.emergencyContacts.length > 1 && (
                          <button type="button" onClick={() => removeContact(index)}
                            className="rounded-ui-sm p-1 text-ink-muted transition-colors hover:bg-emergency-subtle hover:text-emergency"
                            aria-label={t('contacts.removeOne', { n: index + 1 })}
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <label className="sr-only" htmlFor={`cp-c${index}-name`}>{t('contacts.nameOf', { n: index + 1 })}</label>
                        <input id={`cp-c${index}-name`} placeholder={t('contacts.name')} value={contact.name} onChange={(e) => handleContactChange(index, 'name', e.target.value)} className={field} />
                        <label className="sr-only" htmlFor={`cp-c${index}-rel`}>{t('contacts.relationshipOf', { n: index + 1 })}</label>
                        <select
                          id={`cp-c${index}-rel`}
                          value={contact.relationship}
                          onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                          className={field}
                        >
                          <option value="">{t('contacts.relationship')}</option>
                          {(constants?.medical.RELATIONSHIPS || []).map(r => (
                            <option key={r} value={r}>{tValue(r, 'relationship', lang)}</option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor={`cp-c${index}-phone`}>{t('contacts.phoneOf', { n: index + 1 })}</label>
                        <input id={`cp-c${index}-phone`} type="tel" placeholder={t('contacts.phone')} value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} className={field} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Navigation Buttons */}
            <div className="mt-12 flex justify-between gap-4">
              {currentStep > 1 && (
                <button type="button" onClick={prevStep} className="glass rounded-ui-md px-8 py-3 font-bold text-ink-muted transition-all hover:text-ink hover:shadow-card-hover">
                  {t('wizard.back')}
                </button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" onClick={nextStep} className="brand-gradient ms-auto rounded-ui-md px-10 py-3 font-bold text-white shadow-card-hover transition-transform hover:scale-[1.03]">
                  {t('wizard.next')}
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting} className="brand-gradient ms-auto flex items-center gap-2 rounded-ui-md px-10 py-3 font-bold text-white shadow-card-hover transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100">
                  {submitting ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <Save size={20} aria-hidden="true" />} {submitting ? t('wizard.saving') : t('wizard.finalize')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
