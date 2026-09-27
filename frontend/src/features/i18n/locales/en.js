// English strings. Keys are dot-separated and flat on purpose: the file can be
// diffed against fr.js line by line, and `t('a.b.c')` is greppable from any
// component that renders it.
//
// FR is the primary language for this product (CLAUDE.md). This file is the
// translation, not the source — if a key exists here but not in fr.js, the app
// falls back to English rather than showing a raw key, but that is a bug worth
// catching. `npm run` parity check: src/features/i18n/checkParity.js
export default {
  // ── Global ────────────────────────────────────────────────────────────────
  'app.loading': 'Loading…',
  'app.error.network': 'I could not reach the medical service. If this is urgent, call the emergency number now.',

  // ── Language switcher ─────────────────────────────────────────────────────
  'language.switcher.label': 'Interface language',
  'language.switcher.fr': 'Français',
  'language.switcher.en': 'English',

  // ── Theme switcher ────────────────────────────────────────────────────────
  'theme.label': 'Interface theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',

  // ── Auth: login ───────────────────────────────────────────────────────────
  'login.title': 'Welcome Back',
  'login.subtitle': 'Sign in to your NAJDDA account',
  'login.email': 'Email Address',
  'login.password': 'Password',
  'login.submitting': 'Signing in…',
  'login.submit': 'Sign In',
  'login.noAccount': "Don't have an account?",
  'login.signup': 'Sign up',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordPlaceholder': '••••••••',

  // ── Auth: register ────────────────────────────────────────────────────────
  'register.title': 'Create Account',
  'register.subtitle': 'Join NAJDDA and start your health journey',
  'register.fullName': 'Full Name',
  'register.fullNamePlaceholder': 'John Doe',
  'register.email': 'Email Address',
  'register.emailPlaceholder': 'you@example.com',
  'register.password': 'Password',
  'register.passwordPlaceholder': '••••••••',
  'register.submitting': 'Creating account…',
  'register.submit': 'Create Account',
  'register.hasAccount': 'Already have an account?',
  'register.signin': 'Sign in',

  // ── Dashboard ─────────────────────────────────────────────────────────────
  'nav.systemLive': 'System Live',
  'nav.passport': 'Passport',
  'nav.exit': 'Exit',
  'brand.name': 'NAJDDA',

  'dashboard.hero.status': 'Medical Status: Stable',
  'dashboard.hero.greeting': 'Salam, {name}.',
  'dashboard.hero.greetingFallback': 'patient',
  'dashboard.hero.subtitle': 'Your AI-specialized hospital is ready. Select a service to begin your digital consultation.',

  'dashboard.service.triage.title': 'Symptom Triage',
  'dashboard.service.triage.description': 'Speak with our lead nurse about what you are feeling. Structured analysis for safe guidance.',
  'dashboard.service.triage.cta': 'Open Service',
  'dashboard.service.sos.title': 'Emergency SOS',
  'dashboard.service.sos.description': 'Instant first-aid, hospital locator, and emergency contact notification. No conversation required.',
  'dashboard.service.sos.cta': 'Active Mode',

  'dashboard.identity.title': 'Identity Snapshot',
  'dashboard.identity.edit': 'Edit the medical passport',
  'dashboard.identity.bloodGroup': 'Blood Group',
  'dashboard.identity.bmi': 'Current BMI',
  'dashboard.identity.chronic': 'Chronic Registry',
  'dashboard.identity.chronicEmpty': 'No recorded conditions.',
  'dashboard.identity.medication': 'Active Medication',
  'dashboard.identity.medicationEmpty': 'None currently active.',
  'dashboard.identity.lastUpdated': 'Last Updated',
  'dashboard.identity.notSaved': 'Not yet saved',

  'dashboard.hospital.title': 'Primary Hospital',
  'dashboard.hospital.none': 'None set',
  'dashboard.hospital.notSet': 'Not set — enable in Passport',

  // ── Complete profile wizard ───────────────────────────────────────────────
  'wizard.title': 'Medical Passport',
  'wizard.backToDashboard': 'Back to dashboard',
  'wizard.loading': 'Loading medical passport…',
  'wizard.stepOf': 'Step {current} of {total} — {step}',
  'wizard.heroStepOf': 'Step {current} of {total}',
  'wizard.next': 'Next Step',
  'wizard.back': 'Back',
  'wizard.finalize': 'Finalize Passport',
  'wizard.saving': 'Saving…',
  'wizard.error.identity': 'Please fill in all personal information',
  'wizard.error.vitals': 'Please complete your vital information',
  'wizard.error.constants': 'Failed to load form options',
  'wizard.error.update': 'Failed to update profile',

  'wizard.step.identity': 'Identity',
  'wizard.step.vitals': 'Vitals',
  'wizard.step.medical': 'Medical',
  'wizard.step.pharmacy': 'Pharmacy',
  'wizard.step.logistics': 'Logistics',

  'wizard.s1.heading': 'Personal Identity',
  'wizard.s1.phone': 'Phone Number',
  'wizard.s1.phonePlaceholder': '600-000000',
  'wizard.s1.dob': 'Date of Birth',
  'wizard.s1.gender': 'Gender',
  'wizard.s1.select': 'Select',
  'wizard.s1.country': 'Country',
  'wizard.s1.city': 'City',
  // "Preferred language" reads as the UI language, so the label says what it
  // actually controls; the hint disambiguates without lengthening the label,
  // which has to stay short in a two-column grid.
  'wizard.s1.preferredLanguage': 'Language for AI responses',
  'wizard.s1.preferredLanguageHelp': "The language the assistant will answer in. Separate from the interface language in the top right.",
  'wizard.s1.selectCity': 'Select City',

  'wizard.s2.heading': 'Health Profile',
  'wizard.s2.weight': 'Weight (kg)',
  'wizard.s2.height': 'Height (cm)',
  'wizard.s2.bloodType': 'Blood Type',
  'wizard.s2.smoking': 'Smoking Status',
  'wizard.s2.insurance': 'Insurance Type',

  'wizard.s3.heading': 'Allergies & Conditions',
  'wizard.s3.drugAllergies': 'Drug Allergies',
  'wizard.s3.chronic': 'Chronic Conditions',

  'wizard.s4.heading': 'Current Medications',
  'wizard.s4.searchLabel': 'Search a medication',
  'wizard.s4.searchPlaceholder': 'Search for medication (e.g. Doliprane, Amoxicillin)...',
  'wizard.s4.yourMedications': 'Your Medications:',
  'wizard.s4.empty': 'No medications added yet.',
  'wizard.s4.remove': 'Remove',

  'wizard.s5.heading': 'Logistics & Emergency',
  'wizard.s5.preferredHospital': 'Preferred Hospital',
  'wizard.s5.noCity': 'No city selected',
  'wizard.s5.change': 'Change',
  'wizard.s5.searchLabel': 'Search a hospital',
  'wizard.s5.searchPlaceholder': 'Search hospital in {city}...',
  'wizard.s5.searchFallbackCity': 'your city',
  'wizard.s5.hospitalsIn': 'Hospitals in {city}',
  'wizard.s5.gpsText': 'Save your GPS location to help the Locator Agent find the nearest help in emergencies.',
  'wizard.s5.locationSaved': 'Location Saved',
  'wizard.s5.saveLocation': 'Save My Current Location',

  // ── Emergency contacts (shared by wizard + settings) ──────────────────────
  'contacts.heading': 'Emergency Contacts',
  'contacts.add': 'Add',
  'contacts.addContact': '+ Add Contact',
  'contacts.row': 'Contact {n}',
  'contacts.removeOne': 'Remove emergency contact {n}',
  'contacts.name': 'Name',
  'contacts.nameOf': 'Name of contact {n}',
  'contacts.relationship': 'Relationship',
  'contacts.relationshipOf': 'Relationship of contact {n}',
  'contacts.phone': 'Phone',
  'contacts.phoneOf': 'Phone of contact {n}',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Manage Medical Passport',
  'settings.loading': 'Loading medical passport…',
  'settings.saved': 'Medical Passport updated successfully!',
  'settings.error.load': 'Failed to load profile settings',
  'settings.error.update': 'Update failed',

  'settings.identity.heading': 'Account Identity',
  'settings.identity.fullName': 'Full Name',
  'settings.identity.phone': 'Phone Number',
  'settings.identity.country': 'Country',
  'settings.identity.city': 'City',

  'settings.conditions.heading': 'Medical Conditions',
  'settings.conditions.group': 'Medical Conditions',

  'settings.meds.heading': 'Current Medications',
  'settings.meds.searchLabel': 'Search a medication',
  'settings.meds.searchPlaceholder': 'Search to add new medication…',
  'settings.meds.remove': 'Remove',
  'settings.meds.confirmRemove': 'Remove {name} from your medical passport?',
  'settings.meds.empty': 'No medication recorded yet. Search above to add one — nurses see this list during triage.',

  'settings.emergency.heading': 'Emergency Contacts',
  'settings.emergency.addContact': '+ Add Contact',

  'settings.saving': 'Saving Changes…',
  'settings.save': 'Save Medical Passport Updates',

  // ── Chat / triage ─────────────────────────────────────────────────────────
  'chat.title': 'Symptom Triage',
  'chat.subtitle': 'Multi-agent consultation · AR · Darija · FR · EN',
  'chat.backToDashboard': 'Back to dashboard',
  'chat.clear': 'Clear conversation',
  'chat.confirmClear': 'Clear the whole conversation? This cannot be undone.',
  'chat.empty.title': 'Describe what you are feeling',
  'chat.empty.body': 'Write in Darija, Arabic, French or English. A nurse agent will ask follow-up questions and summarise what it finds.',
  'chat.empty.ex1': 'A headache that will not go away since yesterday',
  'chat.empty.ex2': 'Fever with chest tightness when I lie down',
  'chat.empty.ex3': 'The dose of insulin I take at night',
  'chat.empty.notEmergency': 'This is not an emergency service',
  'chat.empty.emergencyText': 'Chest pain, breathing trouble, heavy bleeding or loss of consciousness?',
  'chat.empty.callNow': 'Call {number} now',
  'chat.log': 'Conversation',
  'chat.emergencyDetected': 'Emergency detected',
  'chat.consulting': 'Consulting agents…',
  'chat.emergencyTitle': 'Emergency detected',
  'chat.emergencyBody': 'Do not wait for a chat reply. Call now.',
  'chat.call': 'Call {number}',
  'chat.inputLabel': 'Describe your symptoms',
  'chat.inputPlaceholder': 'Describe your symptoms…',
  'chat.send': 'Send',
};
