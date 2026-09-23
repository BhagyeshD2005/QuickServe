import axios from 'axios';
import { API_BASE_URL } from './axios';

export interface ApiHealthStatus {
  online: boolean;
  name?: string;
  version?: string;
  statusText?: string;
  latencyMs?: number;
}

export const healthApi = {
  checkHealth: async (): Promise<ApiHealthStatus> => {
    const startTime = Date.now();
    try {
      const response = await axios.get(API_BASE_URL, { timeout: 6000 });
      const latencyMs = Date.now() - startTime;
      if (response.status === 200 && response.data?.status === 'online') {
        return {
          online: true,
          name: response.data.name || 'QuickServe API',
          version: response.data.version || '1.0.0',
          statusText: 'API Connected',
          latencyMs,
        };
      }
      return {
        online: true,
        statusText: 'API Connected',
        latencyMs,
      };
    } catch {
      // Fallback check against /api/services which is public
      try {
        const fallback = await axios.get(`${API_BASE_URL}/api/services`, { timeout: 6000 });
        if (fallback.status === 200) {
          return {
            online: true,
            statusText: 'API Connected',
            latencyMs: Date.now() - startTime,
          };
        }
      } catch {
        // failed
      }
      return {
        online: false,
        statusText: 'API Offline',
      };
    }
  },
};

export default healthApi;
