import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
if (!ENV_URL) {
  throw new Error('[apiClient] EXPO_PUBLIC_API_URL manquant — configurez .env mobile');
}
export const API_URL = ENV_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('najdda_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('najdda_token');
    }
    return Promise.reject(error);
  }
);

apiClient.getToken = async () => {
  return await SecureStore.getItemAsync('najdda_token');
};

export default apiClient;
