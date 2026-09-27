const db = require('../database');
const Profile = require('../../core/entities/Profile');

class ProfileRepository {
  mapToEntity(row) {
    if (!row) return null;
    return new Profile({
      id: row.id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      bloodType: row.blood_type,
      city: row.city,
      country: row.country,
      preferredLanguage: row.preferred_language,
      weight: row.weight,
      height: row.height,
      isPregnant: row.is_pregnant,
      drugAllergies: row.drug_allergies,
      foodAllergies: row.food_allergies,
      smokingStatus: row.smoking_status,
      alcoholStatus: row.alcohol_status,
      insuranceType: row.insurance_type,
      medications: row.medications,
      preferredHospital: row.preferred_hospital,
      latitude: row.latitude,
      longitude: row.longitude,
      medicalHistory: row.medical_history,
      chronicDiseases: row.chronic_diseases,
      emergencyContacts: row.emergency_contacts,
      updatedAt: row.updated_at
    });
  }

  async findByUserId(userId) {
    const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    return this.mapToEntity(result.rows[0]);
  }

  async create(userId) {
    const result = await db.query(
      'INSERT INTO profiles (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return this.mapToEntity(result.rows[0]);
  }

  async update(userId, data) {
    // Filter out undefined values to prevent SQL errors
    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === undefined ? null : value;
      return acc;
    }, {});

    const fields = Object.keys(filteredData).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(filteredData);
    
    const result = await db.query(
      `UPDATE profiles SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *`,
      [userId, ...values]
    );
    return this.mapToEntity(result.rows[0]);
  }
}

module.exports = new ProfileRepository();
