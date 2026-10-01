const profileRepository = require('../../infra/repositories/ProfileRepository');
const authPresenter = require('../presenters/AuthPresenter');
const { MEDICAL_CONSTANTS, GEOGRAPHY_CONSTANTS } = require('../../core/constants');

class ProfileController {
  async getConstants(req, res) {
    res.status(200).json({
      medical: MEDICAL_CONSTANTS,
      geography: GEOGRAPHY_CONSTANTS
    });
  }

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { 
        phoneNumber, dateOfBirth, gender, bloodType, city, country, 
        preferredLanguage, chronicDiseases, weight, height,
        isPregnant, drugAllergies, foodAllergies, smokingStatus,
        alcoholStatus, insuranceType, emergencyContacts,
        medications, preferredHospital, latitude, longitude
      } = req.body;

      // Strict Validation (sans log PII)
      const toNum = (v, min, max) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        if (min !== undefined && n < min) return null;
        if (max !== undefined && n > max) return null;
        return n;
      };
      const toLat = (v) => toNum(v, -90, 90);
      const toLng = (v) => toNum(v, -180, 180);

      const missingFields = [];
      if (!phoneNumber) missingFields.push('phoneNumber');
      if (!dateOfBirth) missingFields.push('dateOfBirth');
      if (!gender) missingFields.push('gender');
      if (!bloodType) missingFields.push('bloodType');
      if (!city) missingFields.push('city');
      if (!country) missingFields.push('country');
      if (!preferredLanguage) missingFields.push('preferredLanguage');
      if (!chronicDiseases) missingFields.push('chronicDiseases');
      if (!weight) missingFields.push('weight');
      if (!height) missingFields.push('height');

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: 'Some core medical fields are missing',
          missingFields 
        });
      }

      const updatedProfile = await profileRepository.update(userId, {
        phone_number: phoneNumber || '',
        date_of_birth: dateOfBirth || null,
        gender: gender || '',
        blood_type: bloodType || '',
        city: city || '',
        country: country || 'Morocco',
        preferred_language: preferredLanguage || 'Arabic',
        weight: toNum(weight, 20, 300),
        height: toNum(height, 50, 250),
        is_pregnant: isPregnant === true,
        drug_allergies: Array.isArray(drugAllergies) ? drugAllergies.join(', ') : (drugAllergies || 'None'),
        food_allergies: Array.isArray(foodAllergies) ? foodAllergies.join(', ') : (foodAllergies || 'None'),
        smoking_status: smokingStatus || 'Non-smoker',
        alcohol_status: alcoholStatus || 'Never',
        insurance_type: insuranceType || 'None',
        chronic_diseases: Array.isArray(chronicDiseases) ? chronicDiseases.join(', ') : (chronicDiseases || 'None'),
        medications: Array.isArray(medications) ? medications : [],
        preferred_hospital: preferredHospital || '',
        latitude: toLat(latitude),
        longitude: toLng(longitude),
        emergency_contacts: Array.isArray(emergencyContacts) ? emergencyContacts : []
      });
      
      const userWithProfile = { ...req.user, profile: updatedProfile };
      res.status(200).json({ 
        user: authPresenter.toPublicUser(userWithProfile) 
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new ProfileController();
