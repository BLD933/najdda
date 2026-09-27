import { fetch } from 'expo/fetch';
import apiClient, { API_URL } from '../../../api/apiClient';

const chatService = {
  sendMessage: async (message) => {
    const response = await apiClient.post('/chat/message', { message });
    return response.data;
  },

  sendMessageStream: async (message, onToken, onDone, onError, onEmergency) => {
    try {
      const token = await apiClient.getToken();

      const response = await fetch(`${API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, stream: true }),
      });

      if (!response.ok) {
        const err = await response.text();
        onError(`Request failed: ${err}`);
        return;
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        if (data.isEmergency && onEmergency) {
          onEmergency(data);
          return;
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(part.slice(6));
            if (data.type === 'token') {
              onToken(data.content);
            } else if (data.type === 'done') {
              onDone(data);
            } else if (data.type === 'error') {
              onError(data.message);
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch (error) {
      onError(error.message);
    }
  },

  resetChat: async () => {
    const response = await apiClient.post('/chat/reset');
    return response.data;
  },

  sendVisionImage: async (imageBase64, message) => {
    const response = await apiClient.post('/chat/vision', { imageBase64, message });
    return response.data;
  }
};

export default chatService;
