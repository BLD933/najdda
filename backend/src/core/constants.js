const MEDICAL_CONSTANTS = {
  BLOOD_TYPES: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  LANGUAGES: ['Arabic', 'Moroccan Darija', 'French', 'Tamazight', 'English'],
  CHRONIC_CONDITIONS: [
    'None (Healthy)',
    'Diabetes Type 1',
    'Diabetes Type 2',
    'Hypertension',
    'Asthma',
    'Heart Disease',
    'Chronic Kidney Disease',
    'Thyroid Disorder',
    'Epilepsy',
    'Other'
  ],
  GENDERS: ['Male', 'Female'],
  RELATIONSHIPS: ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend', 'Other'],
  ALLERGIES: {
    DRUGS: ['None', 'Penicillin', 'Aspirin', 'Sulfa drugs', 'NSAIDs', 'Other'],
    FOOD: ['None', 'Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Other']
  },
  LIFESTYLE: {
    SMOKING: ['Non-smoker', 'Smoker', 'Former smoker'],
    ALCOHOL: ['Never', 'Occasionally', 'Regularly']
  },
  INSURANCE_MOROCCO: ['AMO', 'CNOPS', 'Private', 'AMO-Tadamoun (RAMED)', 'None / Self-Pay'],
  MEDICAL_EQUIPMENT: ['None', 'Pacemaker', 'Insulin Pump', 'Oxygen Tank', 'Hearing Aid', 'Prosthesis', 'Wheelchair', 'Other']
};

const GEOGRAPHY_CONSTANTS = {
  MOROCCAN_CITIES: [
    'Casablanca', 'Rabat', 'Fes', 'Marrakech', 'Tangier', 
    'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 
    'Safi', 'Mohammedia', 'Beni Mellal', 'El Jadida', 'Taza'
  ],
  COUNTRIES: ['Morocco', 'International / Other'],
  COUNTRY_CODES: [
    { code: '+212', country: 'Morocco' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+33', country: 'France' },
    { code: '+34', country: 'Spain' },
    { code: '+44', country: 'UK' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+971', country: 'UAE' },
    { code: '+213', country: 'Algeria' },
    { code: '+216', country: 'Tunisia' },
    { code: '+20', country: 'Egypt' },
    { code: '+49', country: 'Germany' }
  ]
};

module.exports = { MEDICAL_CONSTANTS, GEOGRAPHY_CONSTANTS };
