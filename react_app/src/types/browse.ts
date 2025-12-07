export interface ArxivPaper {
  paper_id: string;
  title: string;
  abstract: string;
  category_sk: number;
  published_at: string;
  updated_at: string;
  _loaded_at: string;
  tags: string[];
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  source_sk: number;
  published_at: string;
  _loaded_at: string;
  tags: string[];
}

export interface RedditPost {
  post_id: string;
  title: string;
  author_sk: number;
  date_sk: number;
  created_utc: string;
  _loaded_at: string;
  tags: string[];
}
