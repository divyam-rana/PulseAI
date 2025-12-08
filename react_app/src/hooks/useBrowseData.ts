import { useQuery } from '@tanstack/react-query';
import type { ArxivPaper, NewsArticle, RedditPost } from '@/types/browse';
import { getApiUrl } from '@/lib/apiUrl';

const API_BASE_URL = `${getApiUrl()}/api`;

interface BrowseParams {
  limit?: number;
  tag?: string;
  search?: string;
}

export function useArxivPapers(params: BrowseParams = {}) {
  return useQuery({
    queryKey: ['arxiv-papers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.tag && params.tag !== 'all') searchParams.append('tag', params.tag);
      if (params.search) searchParams.append('search', params.search);

      const response = await fetch(`${API_BASE_URL}/arxiv-papers?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch arxiv papers');
      const data = await response.json();
      return data.papers as ArxivPaper[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNewsArticles(params: BrowseParams = {}) {
  return useQuery({
    queryKey: ['news-articles', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.tag && params.tag !== 'all') searchParams.append('tag', params.tag);
      if (params.search) searchParams.append('search', params.search);

      const response = await fetch(`${API_BASE_URL}/news-articles?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch news articles');
      const data = await response.json();
      return data.articles as NewsArticle[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRedditPosts(params: BrowseParams = {}) {
  return useQuery({
    queryKey: ['reddit-posts', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.tag && params.tag !== 'all') searchParams.append('tag', params.tag);
      if (params.search) searchParams.append('search', params.search);

      const response = await fetch(`${API_BASE_URL}/reddit-posts?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch reddit posts');
      const data = await response.json();
      return data.posts as RedditPost[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
