import apiClient from '../../../api/apiClient';

export const checkInteractions = async (message, history, medications, imageBase64) => {
  try {
    const response = await apiClient.post('/medications/check', {
      message,
      history,
      medications,
      imageBase64
    });
    return response.data;
  } catch (error) {
    console.error('Drug API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to check drug interactions'
    );
  }
};
