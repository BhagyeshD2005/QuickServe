import api from './axios';
import {
  ApiResponse,
  RequestDetailsData,
  RequestPriority,
  RequestStatus,
  ServiceRequest,
} from '../types';

export interface CreateRequestPayload {
  service_id: string;
  description: string;
  preferred_at: string;
  address: string;
  priority: RequestPriority;
}

export const requestsApi = {
  getAdminRequests: async (): Promise<ServiceRequest[]> => {
    try {
      const response = await api.get<ApiResponse<unknown>>('/api/admin/requests');
      const raw = response.data?.data ?? response.data;
      if (Array.isArray(raw)) return raw as ServiceRequest[];
      const asRecord = raw as Record<string, unknown>;
      if (Array.isArray(asRecord?.requests)) return asRecord.requests as ServiceRequest[];
      if (Array.isArray(asRecord?.data)) return asRecord.data as ServiceRequest[];
    } catch {
      // Fallback to /api/requests
      try {
        const fallback = await api.get<ApiResponse<unknown>>('/api/requests');
        const raw = fallback.data?.data ?? fallback.data;
        if (Array.isArray(raw)) return raw as ServiceRequest[];
        const asRecord = raw as Record<string, unknown>;
        if (Array.isArray(asRecord?.requests)) return asRecord.requests as ServiceRequest[];
        if (Array.isArray(asRecord?.data)) return asRecord.data as ServiceRequest[];
      } catch {
        // Return empty array
        return [];
      }
    }
    return [];
  },

  seedSampleRequests: async (): Promise<number> => {
    const samples: CreateRequestPayload[] = [
      {
        service_id: 'svc-ac',
        description: 'Commercial AC cooling failure in main conference room. Temperature is rising rapidly.',
        preferred_at: new Date(Date.now() + 86400000).toISOString(),
        address: '742 Evergreen Terrace, Sector 4, Tech Park',
        priority: 'HIGH',
      },
      {
        service_id: 'svc-plumbing',
        description: 'Main water line valve inspection and pressure regulator replacement.',
        preferred_at: new Date(Date.now() + 172800000).toISOString(),
        address: '100 University Avenue, Block C, Apt 304',
        priority: 'MEDIUM',
      },
      {
        service_id: 'svc-electrical',
        description: 'Emergency circuit breaker tripping repeatedly after heavy appliance load.',
        preferred_at: new Date(Date.now() + 43200000).toISOString(),
        address: '88 Innovation Boulevard, West Wing Fl 2',
        priority: 'CRITICAL',
      },
      {
        service_id: 'svc-cleaning',
        description: 'Deep sanitary cleaning and surface disinfection for corporate lobby.',
        preferred_at: new Date(Date.now() + 259200000).toISOString(),
        address: '12 Financial Center Plaza, Level 8',
        priority: 'LOW',
      },
      {
        service_id: 'svc-ac',
        description: 'Routine quarterly filter replacement and coolant level check.',
        preferred_at: new Date(Date.now() + 345600000).toISOString(),
        address: '55 Pine Crest Road, Suite 12B',
        priority: 'MEDIUM',
      },
    ];

    let createdCount = 0;
    for (const sample of samples) {
      try {
        await api.post('/api/requests', sample);
        createdCount++;
      } catch {
        // continue
      }
    }
    return createdCount;
  },

  getRequestById: async (id: string): Promise<RequestDetailsData> => {
    const response = await api.get<ApiResponse<RequestDetailsData>>(`/api/requests/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to load request details');
    }
    return response.data.data;
  },

  assignAgent: async (requestId: string, agentId: string): Promise<void> => {
    const response = await api.post<ApiResponse>(`/api/requests/${requestId}/assign`, {
      agent_id: agentId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to assign agent');
    }
  },

  updateStatus: async (requestId: string, status: RequestStatus): Promise<void> => {
    const response = await api.patch<ApiResponse>(`/api/requests/${requestId}/status`, {
      status,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update request status');
    }
  },

  addNote: async (requestId: string, note: string): Promise<void> => {
    const response = await api.post<ApiResponse>(`/api/requests/${requestId}/notes`, {
      note,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to add note');
    }
  },

  createRequest: async (payload: CreateRequestPayload): Promise<{ id: string; request_number: string }> => {
    const response = await api.post<ApiResponse<{ id: string; request_number: string }>>(
      '/api/requests',
      payload
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create service request');
    }
    return response.data.data;
  },
};

export default requestsApi;
