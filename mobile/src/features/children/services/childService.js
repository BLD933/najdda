import api from '../../../api/apiClient';

class ChildService {
  async check({ message = '', history = [], childProfile, medication, imageBase64 }) {
    try {
      const response = await api.post('/children/check', {
        message,
        history,
        childProfile,
        medication,
        imageBase64,
      });
      return response.data;
    } catch (error) {
      console.error('Child API Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new ChildService();
