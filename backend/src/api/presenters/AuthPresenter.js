class AuthPresenter {
  static toPublicUser(user) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profile: user.profile ? {
        phoneNumber: user.profile.phoneNumber,
        dateOfBirth: user.profile.dateOfBirth,
        gender: user.profile.gender,
        bloodType: user.profile.bloodType,
        city: user.profile.city,
        country: user.profile.country,
        preferredLanguage: user.profile.preferredLanguage,
        weight: user.profile.weight,
        height: user.profile.height,
        isPregnant: user.profile.isPregnant,
        drugAllergies: user.profile.drugAllergies,
        foodAllergies: user.profile.foodAllergies,
        smokingStatus: user.profile.smokingStatus,
        alcoholStatus: user.profile.alcoholStatus,
        insuranceType: user.profile.insuranceType,
        medications: user.profile.medications,
        preferredHospital: user.profile.preferredHospital,
        latitude: user.profile.latitude,
        longitude: user.profile.longitude,
        medicalHistory: user.profile.medicalHistory,
        chronicDiseases: user.profile.chronicDiseases,
        emergencyContacts: user.profile.emergencyContacts,
      } : null,
      createdAt: user.createdAt
    };
  }

  static toAuthResponse(user, token) {
    return {
      user: this.toPublicUser(user),
      token
    };
  }
}

module.exports = AuthPresenter;
