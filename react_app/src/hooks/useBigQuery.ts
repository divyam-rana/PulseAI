import { useQuery } from '@tanstack/react-query';
import { apiClient, NewsletterQueryParams } from '@/lib/api';

export function useNewsletters(params?: NewsletterQueryParams) {
  return useQuery({
    queryKey: ['newsletters', params],
    queryFn: () => apiClient.getNewsletters(params),
  });
}

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: () => apiClient.getTables(),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.getTags(),
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
  });
}

export function useBigQueryData(
  tableName: string,
  filters?: Record<string, string>,
  limit?: number
) {
  return useQuery({
    queryKey: ['bigquery', tableName, filters, limit],
    queryFn: () => apiClient.query({ tableName, filters, limit }),
    enabled: !!tableName,
  });
}
