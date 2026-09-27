import apiClient from '../../../api/apiClient';

const profileService = {
  getConstants: async () => {
    const response = await apiClient.get('/profile/constants');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/profile', profileData);
    return response.data;
  },
};

export default profileService;
