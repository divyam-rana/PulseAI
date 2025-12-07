import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ExternalLink, Calendar, User, BookOpen, Newspaper, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TAG_COLORS } from '@/lib/tagColors';
import { format } from 'date-fns';

interface ArxivPaper {
  paper_id: string;
  title: string;
  abstract: string;
  published_at: string;
  tags?: string[];
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  published_at: string;
  tags?: string[];
}

interface RedditPost {
  post_id: string;
  title: string;
  author_sk: number;
  created_utc: string;
  tags?: string[];
}

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('papers');
  
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  
  const [papersLoading, setPapersLoading] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  
  const [papersError, setPapersError] = useState<string | null>(null);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Fetch arxiv papers
  useEffect(() => {
    const fetchPapers = async () => {
      setPapersLoading(true);
      setPapersError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedTag !== 'all') params.append('tag', selectedTag);
        if (searchQuery) params.append('search', searchQuery);
        
        const response = await fetch(`http://localhost:3001/api/arxiv-papers?${params}`);
        if (!response.ok) throw new Error('Failed to fetch papers');
        const data = await response.json();
        setPapers(data.papers || []);
      } catch (error) {
        setPapersError((error as Error).message);
        setPapers([]);
      } finally {
        setPapersLoading(false);
      }
    };
    fetchPapers();
  }, [selectedTag, searchQuery]);

  // Fetch news articles
  useEffect(() => {
    const fetchArticles = async () => {
      setArticlesLoading(true);
      setArticlesError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedTag !== 'all') params.append('tag', selectedTag);
        if (searchQuery) params.append('search', searchQuery);
        
        const response = await fetch(`http://localhost:3001/api/news-articles?${params}`);
        if (!response.ok) throw new Error('Failed to fetch articles');
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        setArticlesError((error as Error).message);
        setArticles([]);
      } finally {
        setArticlesLoading(false);
      }
    };
    fetchArticles();
  }, [selectedTag, searchQuery]);

  // Fetch reddit posts
  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedTag !== 'all') params.append('tag', selectedTag);
        if (searchQuery) params.append('search', searchQuery);
        
        const response = await fetch(`http://localhost:3001/api/reddit-posts?${params}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        setPostsError((error as Error).message);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [selectedTag, searchQuery]);

  const getTagColor = (tag: string) => {
    return TAG_COLORS[tag] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Date unavailable';
    }
  };

  const allTags = Array.from(new Set([
    ...papers.flatMap(p => p.tags || []),
    ...articles.flatMap(a => a.tags || []),
    ...posts.flatMap(p => p.tags || [])
  ])).sort();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Browse Content
        </h1>
        <p className="text-muted-foreground text-lg">
          Explore research papers, news articles, and community discussions
        </p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, description, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tabs for different content types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="papers" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Research Papers ({papers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            News Articles ({articles?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reddit" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Reddit Posts ({posts?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Research Papers Tab */}
        <TabsContent value="papers" className="space-y-4">
          {papersError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive mb-2">Error loading papers</p>
                <p className="text-sm text-muted-foreground">{papersError}</p>
              </CardContent>
            </Card>
          ) : papersLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading research papers...</p>
              </CardContent>
            </Card>
          ) : papers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No papers found matching your criteria
              </CardContent>
            </Card>
          ) : (
            papers.map((paper, index) => (
              <motion.div
                key={paper.paper_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{paper.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          Published: {formatDate(paper.published_at)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="shrink-0"
                      >
                        <a
                          href={`https://arxiv.org/abs/${paper.paper_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Paper
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {paper.abstract}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {paper.tags?.map((tag) => (
                        <Badge
                          key={tag}
                          className={`${getTagColor(tag)} text-white`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* News Articles Tab */}
        <TabsContent value="news" className="space-y-4">
          {articlesError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive mb-2">Error loading articles</p>
                <p className="text-sm text-muted-foreground">{articlesError}</p>
              </CardContent>
            </Card>
          ) : articlesLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading news articles...</p>
              </CardContent>
            </Card>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No articles found matching your criteria
              </CardContent>
            </Card>
          ) : (
            articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                      {article.image && (
                        <div className="md:w-48 md:shrink-0">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-32 object-cover rounded-md"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{article.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm mb-2">
                          <Calendar className="h-3 w-3" />
                          Published: {formatDate(article.published_at)}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.tags?.map((tag) => (
                        <Badge
                          key={tag}
                          className={`${getTagColor(tag)} text-white`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Read Full Article
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Reddit Posts Tab */}
        <TabsContent value="reddit" className="space-y-4">
          {postsError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive mb-2">Error loading posts</p>
                <p className="text-sm text-muted-foreground">{postsError}</p>
              </CardContent>
            </Card>
          ) : postsLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading Reddit posts...</p>
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No posts found matching your criteria
              </CardContent>
            </Card>
          ) : (
            posts.map((post, index) => (
              <motion.div
                key={post.post_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Author ID: {post.author_sk}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.created_utc)}
                          </span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="shrink-0"
                      >
                        <a
                          href={`https://reddit.com/comments/${post.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Reddit
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {post.tags?.map((tag) => (
                        <Badge
                          key={tag}
                          className={`${getTagColor(tag)} text-white`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
