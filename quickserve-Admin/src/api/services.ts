import api from './axios';
import { ApiResponse, Service } from '../types';

export const servicesApi = {
  getServices: async (): Promise<Service[]> => {
    const response = await api.get<ApiResponse<Service[]>>('/api/services');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to load services');
    }
    return response.data.data;
  },

  createService: async (data: Partial<Service>): Promise<Service> => {
    const response = await api.post<ApiResponse<Service>>('/api/services', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create service');
    }
    return response.data.data;
  },
};

export default servicesApi;
