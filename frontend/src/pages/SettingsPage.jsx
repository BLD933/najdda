import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import profileService from '../features/auth/services/profileService';
import { 
  ArrowLeft, Save, User, Phone, MapPin, Droplets, 
  Activity, Languages, Loader2, CheckCircle2 
} from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [constants, setConstants] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMed, setSearchingMed] = useState(false);

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
            chronicDiseases: user.profile.chronicDiseases?.split(', ') || ['None (Healthy)'],
            medications: user.profile.medications || [],
            preferredHospital: user.profile.preferredHospital || '',
            emergencyContacts: user.profile.emergencyContacts || [{ name: '', relationship: '', phone: '' }]
          });
        }
      } catch (err) {
        setError('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
      if (value.includes('None')) return { ...prev, [field]: [value] };
      let updated = current.filter(v => !v.includes('None'));
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
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <nav className="bg-white border-b px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Manage Medical Passport</h1>
      </nav>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 size={20} />
            <span className="font-medium">Medical Passport updated successfully!</span>
          </div>
        )}

        {/* SECTION: Identity */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><User className="text-blue-500" size={20} /> Account Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <input disabled value={user?.fullName} className="w-full p-3 bg-gray-50 border rounded-xl cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full p-3 border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Country</label>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full p-3 border rounded-xl">
                {constants?.geography.COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">City</label>
              <input name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border rounded-xl" />
            </div>
          </div>
        </div>

        {/* SECTION: Medical Conditions */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Activity className="text-blue-500" size={20} /> Medical Conditions</h3>
          <div className="flex flex-wrap gap-2">
            {constants?.medical.CHRONIC_CONDITIONS.map(c => (
              <button key={c} type="button" onClick={() => handleMultiSelect('chronicDiseases', c)}
                className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                  formData.chronicDiseases.includes(c) ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* SECTION: Pharmacy */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Droplets className="text-blue-500" size={20} /> Current Medications</h3>
          <div className="relative">
            <input
              placeholder="Search to add new medication..."
              value={medicationSearch}
              onChange={(e) => setMedicationSearch(e.target.value)}
              className="w-full p-3 border-2 border-blue-50 rounded-xl outline-none focus:border-blue-500 transition-all"
            />
            {searchingMed && <Loader2 className="absolute right-3 top-3 animate-spin text-blue-500" />}
            {medicationResults.length > 0 && (
              <div className="absolute w-full mt-2 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
                {medicationResults.map(m => (
                  <button key={m.id} type="button" onClick={() => addMedication(m)} className="w-full p-4 text-left hover:bg-blue-50 border-b last:border-0">
                    <p className="font-bold text-sm">{m.nom}</p>
                    <p className="text-xs text-gray-500">{m.dosage1}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {formData.medications.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{m.nom}</p>
                  <p className="text-xs text-gray-500">{m.dosage1}</p>
                </div>
                <button type="button" onClick={() => setFormData(p => ({ ...p, medications: p.medications.filter(x => x.id !== m.id) }))} className="text-red-500 font-bold text-xs">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: Emergency */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2"><Phone className="text-red-500" size={20} /> Emergency Contacts</h3>
            <button type="button" onClick={addContact} className="text-blue-600 font-bold text-sm">+ Add Contact</button>
          </div>
          <div className="space-y-4">
            {formData.emergencyContacts.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl">
                <input placeholder="Name" value={c.name} onChange={(e) => handleContactChange(i, 'name', e.target.value)} className="p-3 border rounded-xl bg-white" />
                <select value={c.relationship} onChange={(e) => handleContactChange(i, 'relationship', e.target.value)} className="p-3 border rounded-xl bg-white">
                  <option value="">Relationship</option>
                  {constants?.medical.RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input placeholder="Phone" value={c.phone} onChange={(e) => handleContactChange(i, 'phone', e.target.value)} className="p-3 border rounded-xl bg-white" />
              </div>
            ))}
          </div>
        </div>

        {/* Sticky Save Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t flex justify-center z-50 shadow-2xl">
          <button 
            type="submit" 
            disabled={saving}
            className="max-w-xl w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} 
            {saving ? 'Saving Changes...' : 'Save Medical Passport Updates'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
