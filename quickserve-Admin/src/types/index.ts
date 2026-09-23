export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  address?: string | null;
  avatar_url?: string | null;
  created_at: string;
  status?: string;
}

export type RequestStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Service {
  id: string;
  name: string;
  description: string;
  is_active: number | boolean;
  base_price?: number;
  created_at?: string;
}

export interface ServiceRequest {
  id: string;
  request_number: string;
  customer_id: string;
  service_id: string;
  description: string;
  preferred_at: string;
  address: string;
  priority: RequestPriority;
  status: RequestStatus;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
  service_name?: string;
  service_description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_phone?: string | null;
  history?: RequestHistoryItem[];
  notes?: RequestNote[];
}

export interface RequestHistoryItem {
  id: string;
  request_id?: string;
  old_status?: RequestStatus | null;
  previous_status?: RequestStatus | null;
  new_status: RequestStatus;
  changed_by?: string;
  note?: string | null;
  created_at: string;
  changed_by_name?: string;
}

export interface RequestNote {
  id: string;
  request_id?: string;
  author_id?: string;
  note: string;
  created_at: string;
  author_name?: string;
}

export interface RequestDetailsData {
  request: ServiceRequest;
  history: RequestHistoryItem[];
  notes: RequestNote[];
}

export type RequestDetails = RequestDetailsData;

export interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_customers: number;
  total_agents: number;
  fulfillment_rate: number;
  active_backlog: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  agent_utilization_ratio?: number;
  customer_request_ratio?: number;
  service_breakdown?: { service_name: string; count: number; percentage: number }[];
  priority_breakdown?: { priority: string; count: number; percentage: number }[];
  recent_requests?: ServiceRequest[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource?: string;
  description?: string;
  ip_address?: string;
  metadata?: Record<string, unknown> | string;
  created_at: string;
  actor_name?: string;
  entity_type?: string;
  entity_id?: string;
  request_number?: string;
  previous_status?: string | null;
  new_status?: string;
  note?: string;
}

export type AuditLogItem = AuditLog;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
  };
}
