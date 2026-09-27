import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import profileService from '../features/auth/services/profileService';
import { User, Phone, MapPin, Droplets, Activity, Languages, Loader2, Save } from 'lucide-react';

const CompleteProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [constants, setConstants] = useState(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(() => {
    const draft = localStorage.getItem('shifaa_profile_draft');
    return draft ? JSON.parse(draft).currentStep : 1;
  });
  const totalSteps = 5;

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [isManualHospital, setIsManualHospital] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalSearchResults, setHospitalSearchResults] = useState([]);
  const [searchingHospitalName, setSearchingHospitalName] = useState(false);

  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem('shifaa_profile_draft');
    if (draft) {
      return JSON.parse(draft).formData;
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
    localStorage.setItem('shifaa_profile_draft', JSON.stringify({ formData, currentStep, isManualHospital }));
  }, [formData, currentStep, isManualHospital]);

  // Auto-load hospitals when user reaches Step 5
  useEffect(() => {
    if (currentStep === 5 && formData.city && nearbyHospitals.length === 0) {
      fetchHospitalsByCity(formData.city);
    }
  }, [currentStep]);

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
  }, [hospitalSearch]);



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
        const res = await fetch(`https://medicament-api.vercel.app/api/medicaments/search?keyword=${medicationSearch}`);
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

  const handleGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
      });
    }
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

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await profileService.getConstants();
        setConstants(data);
      } catch (err) {
        setError('Failed to load form options');
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
      
      // If selecting 'None' or 'None (Healthy)', clear others
      if (value.includes('None')) {
        return { ...prev, [field]: [value] };
      }
      
      // If something else is selected, remove 'None'
      let updated = current.filter(v => !v.includes('None'));
      
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
    const newContacts = [...formData.emergencyContacts];
    newContacts[index][field] = value;
    setFormData({ ...formData, emergencyContacts: newContacts });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      emergencyContacts: [...formData.emergencyContacts, { name: '', relationship: '', phone: '' }]
    });
  };

  const removeContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      const newContacts = formData.emergencyContacts.filter((_, i) => i !== index);
      setFormData({ ...formData, emergencyContacts: newContacts });
    }
  };

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
        setError('Please fill in all personal information');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.weight || !formData.height || !formData.bloodType) {
        setError('Please complete your vital information');
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
      const payload = { 
        ...formData, 
        phoneNumber: fullPhoneNumber,
        weight: formData.weight ? parseInt(formData.weight) : null,
        height: formData.height ? parseInt(formData.height) : null,
      };
      
      // Remove internal frontend-only fields
      delete payload.countryCode;
      
      await profileService.updateProfile(payload);
      localStorage.removeItem('shifaa_profile_draft');
      window.location.href = '/dashboard';
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile';
      const missing = err.response?.data?.missingFields;
      setError(missing ? `${errMsg}: ${missing.join(', ')}` : errMsg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Stepper */}
        <div className="mb-8 flex justify-between items-center px-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all z-10 ${
                currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              <span className={`text-xs mt-2 font-medium ${
                currentStep >= step ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {step === 1 ? 'Identity' : step === 2 ? 'Vitals' : step === 3 ? 'Medical' : step === 4 ? 'Pharmacy' : 'Logistics'}
              </span>
              {step < 5 && (
                <div className={`absolute top-5 left-1/2 w-full h-0.5 z-0 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Medical Passport</h1>
              <p className="text-blue-100 mt-1">Step {currentStep} of {totalSteps}</p>
            </div>
            <Activity size={32} className="opacity-50" />
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Identity & Location */}
            {currentStep === 1 && (
              <section className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <User className="text-blue-600" size={24} /> Personal Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="flex gap-2">
                      <select name="countryCode" value={formData.countryCode} onChange={handleChange}
                        className="w-1/3 p-3 border rounded-xl bg-gray-50">
                        {constants?.geography.COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.country} ({c.code})</option>
                        ))}
                      </select>
                      <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                        className="flex-1 p-3 border rounded-xl" placeholder="600-000000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border rounded-xl">
                      <option value="">Select</option>
                      {constants?.medical.GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Country</label>
                    <select name="country" value={formData.country} onChange={handleChange} className="w-full p-3 border rounded-xl">
                      {constants?.geography.COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    {formData.country === 'Morocco' ? (
                      <select name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border rounded-xl">
                        <option value="">Select City</option>
                        {constants?.geography.MOROCCAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    ) : (
                      <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border rounded-xl" />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Step 2: Physical Vitals & Lifestyle */}
            {currentStep === 2 && (
              <section className="space-y-8 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <Activity className="text-blue-600" size={24} /> Health Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Height (cm)</label>
                    <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Blood Type</label>
                    <select name="bloodType" value={formData.bloodType} onChange={handleChange} className="w-full p-3 border rounded-xl">
                      <option value="">Select</option>
                      {constants?.medical.BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Smoking Status</label>
                    <select name="smokingStatus" value={formData.smokingStatus} onChange={handleChange} className="w-full p-3 border rounded-xl">
                      {constants?.medical.LIFESTYLE.SMOKING.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Insurance Type</label>
                    <select name="insuranceType" value={formData.insuranceType} onChange={handleChange} className="w-full p-3 border rounded-xl">
                      {constants?.medical.INSURANCE_MOROCCO.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Step 3: Medical & Allergies */}
            {currentStep === 3 && (
              <section className="space-y-8 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <Droplets className="text-blue-600" size={24} /> Allergies & Conditions
                </h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">Drug Allergies</label>
                  <div className="flex flex-wrap gap-2">
                    {constants?.medical.ALLERGIES.DRUGS.map(allergy => (
                      <button key={allergy} type="button" onClick={() => handleMultiSelect('drugAllergies', allergy)}
                        className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                          formData.drugAllergies.includes(allergy) ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-white text-gray-600'
                        }`}>{allergy}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">Chronic Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {constants?.medical.CHRONIC_CONDITIONS.map(c => (
                      <button key={c} type="button" onClick={() => handleMultiSelect('chronicDiseases', c)}
                        className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                          formData.chronicDiseases.includes(c) ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white text-gray-600'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Step 4: Pharmacy (New Medications API Step) */}
            {currentStep === 4 && (
              <section className="space-y-8 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <Activity className="text-blue-600" size={24} /> Current Medications
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for medication (e.g. Doliprane, Amoxicillin)..."
                    value={medicationSearch}
                    onChange={(e) => setMedicationSearch(e.target.value)}
                    className="w-full p-4 border-2 border-blue-100 rounded-2xl focus:border-blue-500 transition-all outline-none"
                  />
                  {searchingMed && <Loader2 className="absolute right-4 top-4 animate-spin text-blue-500" />}
                  
                  {medicationResults.length > 0 && (
                    <div className="absolute w-full mt-2 bg-white border rounded-2xl shadow-2xl z-50 overflow-hidden">
                      {medicationResults.map(med => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => addMedication(med)}
                          className="w-full p-4 text-left hover:bg-blue-50 border-b last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-gray-800">{med.nom}</p>
                            <p className="text-xs text-gray-500">{med.forme} - {med.dosage1}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">Your Medications:</h4>
                  {formData.medications.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No medications added yet.</p>
                  ) : (
                    formData.medications.map(med => (
                      <div key={med.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        <div>
                          <p className="font-bold text-gray-800">{med.nom}</p>
                          <p className="text-xs text-gray-500">{med.dosage1}</p>
                        </div>
                        <button type="button" onClick={() => removeMedication(med.id)} className="text-red-500 hover:text-red-700 font-bold">Remove</button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Step 5: Logistics & Equipment */}
            {currentStep === 5 && (
              <section className="space-y-8 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <MapPin className="text-blue-600" size={24} /> Logistics & Emergency
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Preferred Hospital</label>
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                      📍 {formData.city || 'No city selected'}
                    </span>
                  </div>

                  {/* Selected Hospital Badge */}
                  {formData.preferredHospital && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-sm font-medium text-green-800">✓ {formData.preferredHospital}</span>
                      <button
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, preferredHospital: '' })); setHospitalSearch(''); }}
                        className="text-xs text-red-500 font-bold"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search hospital in ${formData.city || 'your city'}...`}
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      className="w-full p-3 border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                    />
                    {(searchingHospitalName || searchingHospitals) && (
                      <Loader2 className="absolute right-3 top-3.5 animate-spin text-blue-500" size={18} />
                    )}
                  </div>

                  {/* City-based preloaded results */}
                  {nearbyHospitals.length > 0 && !hospitalSearch && (
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 bg-gray-50 border-b">Hospitals in {formData.city}</p>
                      {nearbyHospitals.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, preferredHospital: h.name }));
                          }}
                          className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-0 transition-all"
                        >
                          <p className="font-semibold text-gray-800 text-sm">{h.name}</p>
                          <p className="text-xs text-gray-400">{h.address}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search results */}
                  {hospitalSearchResults.length > 0 && hospitalSearch && (
                    <div className="border rounded-xl overflow-hidden shadow-lg bg-white">
                      {hospitalSearchResults.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, preferredHospital: h.name }));
                            setHospitalSearch('');
                            setHospitalSearchResults([]);
                          }}
                          className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-0 transition-all"
                        >
                          <p className="font-semibold text-gray-800 text-sm">{h.name}</p>
                          <p className="text-xs text-gray-400">{h.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-blue-50 rounded-2xl flex flex-col items-center gap-4">
                  <p className="text-sm text-blue-800 font-medium text-center">Save your GPS location to help the Locator Agent find the nearest help in emergencies.</p>
                  <button type="button" onClick={handleGPS} className={`px-6 py-2 rounded-full font-bold transition-all ${
                    formData.latitude ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    {formData.latitude ? 'Location Saved ✓' : '📍 Save My Current Location'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Phone className="text-red-600" size={20} /> Emergency Contacts
                    </h4>
                    <button type="button" onClick={addContact} className="text-blue-600 font-bold">+ Add</button>
                  </div>
                  {formData.emergencyContacts.map((contact, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input placeholder="Name" value={contact.name} onChange={(e) => handleContactChange(index, 'name', e.target.value)} className="p-3 border rounded-xl bg-white" />
                        <select 
                          value={contact.relationship} 
                          onChange={(e) => handleContactChange(index, 'relationship', e.target.value)} 
                          className="p-3 border rounded-xl bg-white"
                        >
                          <option value="">Relationship</option>
                          {constants?.medical.RELATIONSHIPS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <input placeholder="Phone" value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} className="p-3 border rounded-xl bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Navigation Buttons */}
            <div className="mt-12 flex justify-between gap-4">
              {currentStep > 1 && (
                <button type="button" onClick={prevStep} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">
                  Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" onClick={nextStep} className="ml-auto px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  Next Step
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className="ml-auto px-10 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" /> : <Save />} Finalize Passport
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
