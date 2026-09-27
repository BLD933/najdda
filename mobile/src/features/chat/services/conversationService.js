import apiClient from '../../../api/apiClient';

const conversationService = {
  async getHistory(chatType) {
    const response = await apiClient.get(`/conversations/${chatType}`);
    return response.data.messages || [];
  },
  async clearHistory(chatType) {
    await apiClient.delete(`/conversations/${chatType}`);
  },
};

export default conversationService;
