class Profile {
  constructor({
    id,
    userId,
    phoneNumber,
    dateOfBirth,
    gender,
    bloodType,
    city,
    country,
    preferredLanguage,
    weight,
    height,
    isPregnant,
    drugAllergies,
    foodAllergies,
    smokingStatus,
    alcoholStatus,
    insuranceType,
    medications,
    preferredHospital,
    latitude,
    longitude,
    medicalHistory,
    chronicDiseases,
    emergencyContacts,
    updatedAt
  }) {
    this.id = id;
    this.userId = userId;
    this.phoneNumber = phoneNumber || '';
    this.dateOfBirth = dateOfBirth || null;
    this.gender = gender || '';
    this.bloodType = bloodType || '';
    this.city = city || '';
    this.country = country || 'Morocco';
    this.preferredLanguage = preferredLanguage || 'Arabic';
    this.weight = weight || null;
    this.height = height || null;
    this.isPregnant = isPregnant || false;
    this.drugAllergies = drugAllergies || 'None';
    this.foodAllergies = foodAllergies || 'None';
    this.smokingStatus = smokingStatus || 'Non-smoker';
    this.alcoholStatus = alcoholStatus || 'Never';
    this.insuranceType = insuranceType || 'None';
    this.medications = Array.isArray(medications) ? medications : [];
    this.preferredHospital = preferredHospital || '';
    this.latitude = latitude || null;
    this.longitude = longitude || null;
    this.medicalHistory = medicalHistory || '';
    this.chronicDiseases = chronicDiseases || 'None';
    this.emergencyContacts = Array.isArray(emergencyContacts) ? emergencyContacts : [];
    this.updatedAt = updatedAt;
  }
}

module.exports = Profile;
