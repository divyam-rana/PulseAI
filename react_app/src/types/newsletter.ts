export interface Newsletter {
  tag: string;
  window_start: string;
  window_end: string;
  content: string;
  created_at: string;
}

export interface FilterState {
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

export type SortOption = 'newest' | 'oldest' | 'tag';

export interface TagColor {
  bg: string;
  text: string;
  border: string;
}

export interface NewsletterStats {
  total_newsletters: number;
  total_tags: number;
  earliest_date: string;
  latest_date: string;
  tag_distribution: Array<{
    tag: string;
    count: number;
  }>;
}
