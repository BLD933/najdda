import apiClient from '../../../api/apiClient';

const pregnancyService = {
  check: async ({ trimester, symptoms, medication, food, message, imageBase64 }) => {
    const response = await apiClient.post('/pregnancy/check', {
      pregnant: true,
      trimester: String(trimester),
      symptoms,
      medication: medication?.trim() || undefined,
      food: food?.trim() || undefined,
      message,
      imageBase64
    });
    return response.data;
  },
};

export default pregnancyService;
