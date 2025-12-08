// API client for backend communication
import { Newsletter } from '@/types/newsletter';
import { getApiUrl } from './apiUrl';

// In production, API is served from the same origin
// In development, API runs on a different port
const API_BASE_URL = getApiUrl();

export interface QueryParams {
  tableName: string;
  filters?: Record<string, string>;
  limit?: number;
}

export interface NewsletterQueryParams {
  limit?: number;
  tag?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; message: string }>('/api/health');
  }

  // Get newsletters
  async getNewsletters(params?: NewsletterQueryParams) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    
    return this.request<{ data: Newsletter[]; count: number }>(
      `/api/newsletters${queryString ? `?${queryString}` : ''}`
    );
  }

  // Generic query endpoint
  async query(params: QueryParams) {
    return this.request<{ data: Newsletter[]; count: number }>('/api/query', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // List all tables
  async getTables() {
    return this.request<{ tables: string[] }>('/api/tables');
  }

  // Get unique tags
  async getTags() {
    return this.request<{ tags: string[] }>('/api/tags');
  }

  // Get analytics/stats
  async getStats() {
    return this.request<{
      total_newsletters: number;
      total_tags: number;
      earliest_date: string;
      latest_date: string;
      tag_distribution: Array<{ tag: string; count: number }>;
    }>('/api/stats');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
