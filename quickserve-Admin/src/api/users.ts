import api from './axios';
import { ApiResponse, User, UserRole } from '../types';

export interface RoleUpdatePayload {
  role: UserRole;
}

export interface EndpointCheckResult {
  available: boolean;
  status: number;
  message: string;
}

export const usersApi = {
  /**
   * Fetches all registered users from GET /api/admin/users.
   * Throws error if request fails (401, 403, 500, etc.) so UI can handle errors properly.
   */
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<unknown>>('/api/admin/users');
    const raw = response.data?.data ?? response.data;
    if (Array.isArray(raw)) return raw as User[];

    const asRecord = raw as Record<string, unknown>;
    if (Array.isArray(asRecord?.users)) return asRecord.users as User[];
    if (Array.isArray(asRecord?.data)) return asRecord.data as User[];

    // Fallback if users array is under any top-level key
    if (asRecord && typeof asRecord === 'object') {
      for (const key of Object.keys(asRecord)) {
        if (Array.isArray(asRecord[key])) {
          return asRecord[key] as User[];
        }
      }
    }
    return [];
  },

  /**
   * Promotes a CUSTOMER user to AGENT role.
   * Sends: PATCH /api/admin/users/:userId/role
   * Headers: Authorization: Bearer <ADMIN_JWT>, Content-Type: application/json
   * Body: { "role": "AGENT" }
   */
  promoteToAgent: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(
      `/api/admin/users/${userId}/role`,
      { role: 'AGENT' },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Updates user role to any specified role via PATCH /api/admin/users/:userId/role.
   */
  updateUserRole: async (userId: string, role: UserRole): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(
      `/api/admin/users/${userId}/role`,
      { role },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Checks whether the production API currently exposes PATCH /api/admin/users/:userId/role.
   * Verifies against the live /api directory and probe.
   */
  checkRoleEndpointAvailability: async (sampleUserId = 'probe'): Promise<EndpointCheckResult> => {
    try {
      // 1. First check the live API endpoint registry directory: GET /api
      const directoryRes = await api.get<{
        success: boolean;
        endpoints?: { admin?: string[] };
      }>('/api', { validateStatus: () => true });

      if (directoryRes.status === 200 && directoryRes.data?.endpoints?.admin) {
        const isAdminRoleRegistered = directoryRes.data.endpoints.admin.some((ep) =>
          ep.includes('/api/admin/users/:userId/role')
        );
        if (isAdminRoleRegistered) {
          return {
            available: true,
            status: 200,
            message: 'Endpoint PATCH /api/admin/users/:userId/role is verified and active on the production API.',
          };
        }
      }

      // 2. Fallback probe: direct PATCH probe with validateStatus
      const response = await api.patch(
        `/api/admin/users/${sampleUserId}/role`,
        { role: 'AGENT' },
        { validateStatus: () => true }
      );
      if (response.status === 404) {
        return {
          available: false,
          status: 404,
          message: 'Endpoint PATCH /api/admin/users/:userId/role returned 404 Not Found. This endpoint is not currently registered on the production Cloudflare Worker router.',
        };
      }
      return {
        available: response.status >= 200 && response.status < 500,
        status: response.status,
        message: `Endpoint responded with HTTP ${response.status}`,
      };
    } catch (err: unknown) {
      return {
        available: false,
        status: 0,
        message: err instanceof Error ? err.message : 'Network error testing role endpoint',
      };
    }
  },

  getCustomers: async (): Promise<User[]> => {
    const users = await usersApi.getUsers();
    return users.filter((u) => u.role === 'CUSTOMER');
  },

  getAgents: async (): Promise<User[]> => {
    const users = await usersApi.getUsers();
    return users.filter((u) => u.role === 'AGENT');
  },

  getUserById: async (id: string): Promise<User | null> => {
    const users = await usersApi.getUsers();
    return users.find((u) => u.id === id) || null;
  },
};

export default usersApi;
