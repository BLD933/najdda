import api from '../../../api/apiClient';

class AllergyService {
  async check({ symptoms = [], message = '', history = [], city = 'Fes', imageBase64 }) {
    try {
      const response = await api.post('/allergy/check', {
        symptoms,
        message,
        history,
        city,
        imageBase64
      });
      return response.data;
    } catch (error) {
      console.error('Allergy API Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new AllergyService();
