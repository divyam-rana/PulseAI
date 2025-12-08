import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Flame, ArrowUp, ArrowDown, Minus, Calendar, BarChart3, BookOpen, Newspaper, MessageSquare, PieChart as PieChartIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { getApiUrl } from '@/lib/apiUrl';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

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

interface TrendData {
  tag: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  source: 'arxiv' | 'news' | 'reddit';
}

interface TagAnalysis {
  tag: string;
  total: number;
  arxiv: number;
  news: number;
  reddit: number;
  percentage: number;
}

const COLORS = ['#0EA5E9', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316'];

export default function Trends() {
  const [dateRange, setDateRange] = useState("30");
  const [activeSource, setActiveSource] = useState<'all' | 'arxiv' | 'news' | 'reddit'>('all');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [tagAnalysis, setTagAnalysis] = useState<TagAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [totalPapersCount, setTotalPapersCount] = useState<number>(0);
  const [totalArticlesCount, setTotalArticlesCount] = useState<number>(0);
  const [totalPostsCount, setTotalPostsCount] = useState<number>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all data function
  const fetchAllData = async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      // First, fetch the total counts from browse-analytics
      const analyticsResponse = await fetch(`${getApiUrl()}/api/browse-analytics`);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setTotalPapersCount(analyticsData.papers?.total || 0);
        setTotalArticlesCount(analyticsData.articles?.total || 0);
        setTotalPostsCount(analyticsData.posts?.total || 0);
        console.log('Total counts:', {
          papers: analyticsData.papers?.total,
          articles: analyticsData.articles?.total,
          posts: analyticsData.posts?.total
        });
      }

      // Fetch Arxiv papers - use a high limit to get all papers
      const papersParams = new URLSearchParams({ limit: '10000' });
      const papersResponse = await fetch(`${getApiUrl()}/api/arxiv-papers?${papersParams}`);
      if (papersResponse.ok) {
        const papersData = await papersResponse.json();
        const fetchedPapers = papersData.papers || [];
        console.log('Fetched papers:', fetchedPapers.length);
        console.log('Sample paper:', fetchedPapers[0] ? {
          paper_id: fetchedPapers[0].paper_id,
          published_at: fetchedPapers[0].published_at,
          hasTags: !!fetchedPapers[0].tags,
          tagsCount: fetchedPapers[0].tags?.length || 0
        } : 'No papers');
        setPapers(fetchedPapers);
      } else {
        const errorText = await papersResponse.text();
        console.error('Failed to fetch papers:', papersResponse.status, errorText);
        setPapers([]);
      }

      // Fetch News articles - use a high limit to get all articles
      const articlesParams = new URLSearchParams({ limit: '10000' });
      const articlesResponse = await fetch(`${getApiUrl()}/api/news-articles?${articlesParams}`);
      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        const fetchedArticles = articlesData.articles || [];
        setArticles(fetchedArticles);
        console.log('Fetched articles:', fetchedArticles.length);
      } else {
        const errorText = await articlesResponse.text();
        console.error('Failed to fetch articles:', articlesResponse.status, errorText);
        setArticles([]);
      }

      // Fetch Reddit posts - use a high limit to get all posts
      const postsParams = new URLSearchParams({ limit: '10000' });
      const postsResponse = await fetch(`${getApiUrl()}/api/reddit-posts?${postsParams}`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        const fetchedPosts = postsData.posts || [];
        setPosts(fetchedPosts);
        console.log('Fetched posts:', fetchedPosts.length);
      } else {
        const errorText = await postsResponse.text();
        console.error('Failed to fetch posts:', postsResponse.status, errorText);
        setPosts([]);
      }

      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setFetchError((error as Error).message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, []);

  // Calculate trends
  useEffect(() => {
    if (!dataLoaded) return;

    setLoading(true);
    
    const days = parseInt(dateRange);
    const currentPeriodStart = subDays(new Date(), days);
    const previousPeriodStart = subDays(new Date(), days * 2);
    const previousPeriodEnd = subDays(new Date(), days);

    console.log('Calculating trends:', {
      papers: papers.length,
      articles: articles.length,
      posts: posts.length,
      dateRange: days,
      currentPeriodStart: currentPeriodStart.toISOString(),
      previousPeriodStart: previousPeriodStart.toISOString()
    });


    // Helper function to filter by date
    const filterByDate = <T extends { published_at?: any; created_utc?: any }>(
      items: T[],
      startDate: Date,
      endDate?: Date
    ): T[] => {
      return items.filter(item => {
        const dateField = item.published_at || item.created_utc;
        const date = extractDate(dateField);
        if (!date) return false;
        
        if (endDate) {
          return date >= startDate && date < endDate;
        }
        return date >= startDate;
      });
    };

    // Process Arxiv papers
    const currentPapers = filterByDate(papers, currentPeriodStart);
    const previousPapers = filterByDate(papers, previousPeriodStart, previousPeriodEnd);

    // Process News articles
    const currentArticles = filterByDate(articles, currentPeriodStart);
    const previousArticles = filterByDate(articles, previousPeriodStart, previousPeriodEnd);

    // Process Reddit posts
    const currentPosts = filterByDate(posts, currentPeriodStart);
    const previousPosts = filterByDate(posts, previousPeriodStart, previousPeriodEnd);

    console.log('Filtered data:', {
      currentPapers: currentPapers.length,
      previousPapers: previousPapers.length,
      currentArticles: currentArticles.length,
      previousArticles: previousArticles.length,
      currentPosts: currentPosts.length,
      previousPosts: previousPosts.length
    });

    // Get all unique tags from all items (not just filtered)
    const allTags = new Set<string>();
    [...papers, ...articles, ...posts].forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            allTags.add(tag);
          }
        });
      }
    });

    console.log('Found tags:', Array.from(allTags));

    // Calculate trends for each tag and source
    const tagTrends: TrendData[] = [];

    Array.from(allTags).forEach(tag => {
      // Arxiv trends
      if (activeSource === 'all' || activeSource === 'arxiv') {
        const currentCount = currentPapers.filter(p => {
          const itemTags = p.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        const previousCount = previousPapers.filter(p => {
          const itemTags = p.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        
        // Include if there's any data in current or previous period
        if (currentCount > 0 || previousCount > 0) {
          const change = currentCount - previousCount;
          const changePercent = previousCount > 0 
            ? ((change / previousCount) * 100) 
            : (currentCount > 0 ? 100 : 0);
          tagTrends.push({
            tag: `${tag} (Arxiv)`,
            current: currentCount,
            previous: previousCount,
            change,
            changePercent,
            source: 'arxiv'
          });
        }
      }

      // News trends
      if (activeSource === 'all' || activeSource === 'news') {
        const currentCount = currentArticles.filter(a => {
          const itemTags = a.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        const previousCount = previousArticles.filter(a => {
          const itemTags = a.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        
        if (currentCount > 0 || previousCount > 0) {
          const change = currentCount - previousCount;
          const changePercent = previousCount > 0 
            ? ((change / previousCount) * 100) 
            : (currentCount > 0 ? 100 : 0);
          tagTrends.push({
            tag: `${tag} (News)`,
            current: currentCount,
            previous: previousCount,
            change,
            changePercent,
            source: 'news'
          });
        }
      }

      // Reddit trends
      if (activeSource === 'all' || activeSource === 'reddit') {
        const currentCount = currentPosts.filter(p => {
          const itemTags = p.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        const previousCount = previousPosts.filter(p => {
          const itemTags = p.tags || [];
          return Array.isArray(itemTags) && itemTags.includes(tag);
        }).length;
        
        if (currentCount > 0 || previousCount > 0) {
          const change = currentCount - previousCount;
          const changePercent = previousCount > 0 
            ? ((change / previousCount) * 100) 
            : (currentCount > 0 ? 100 : 0);
          tagTrends.push({
            tag: `${tag} (Reddit)`,
            current: currentCount,
            previous: previousCount,
            change,
            changePercent,
            source: 'reddit'
          });
        }
      }
    });

    // Sort by absolute change percentage
    const sortedTrends = tagTrends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    console.log('Calculated trends:', sortedTrends.length);
    setTrends(sortedTrends);

    // Calculate comprehensive tag analysis across all sources
    const tagAnalysisMap = new Map<string, { total: number; arxiv: number; news: number; reddit: number }>();
    
    // Count tags across all items (not filtered by date for overall analysis)
    [...papers, ...articles, ...posts].forEach(item => {
      const itemTags = item.tags || [];
      if (Array.isArray(itemTags)) {
        itemTags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            if (!tagAnalysisMap.has(tag)) {
              tagAnalysisMap.set(tag, { total: 0, arxiv: 0, news: 0, reddit: 0 });
            }
            const counts = tagAnalysisMap.get(tag)!;
            counts.total++;
            
            // Determine source
            if ('paper_id' in item) counts.arxiv++;
            else if ('id' in item && 'url' in item) counts.news++;
            else if ('post_id' in item) counts.reddit++;
          }
        });
      }
    });

    const totalItems = papers.length + articles.length + posts.length;
    const analysis: TagAnalysis[] = Array.from(tagAnalysisMap.entries())
      .map(([tag, counts]) => ({
        tag,
        total: counts.total,
        arxiv: counts.arxiv,
        news: counts.news,
        reddit: counts.reddit,
        percentage: totalItems > 0 ? (counts.total / totalItems) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // Top 20 tags

    setTagAnalysis(analysis);
    setLoading(false);
  }, [papers, articles, posts, dateRange, activeSource, dataLoaded]);

  const topTrending = trends
    .filter(t => t.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  const declining = trends
    .filter(t => t.change < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'arxiv':
        return <BookOpen className="h-4 w-4" />;
      case 'news':
        return <Newspaper className="h-4 w-4" />;
      case 'reddit':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (tag: string) => {
    if (tag.includes('(Arxiv)')) return 'Arxiv';
    if (tag.includes('(News)')) return 'News';
    if (tag.includes('(Reddit)')) return 'Reddit';
    return '';
  };

  const getCleanTag = (tag: string) => {
    return tag.replace(/\s*\(Arxiv\)|\s*\(News\)|\s*\(Reddit\)/g, '');
  };

  // Helper function to extract date from BigQuery timestamp
  const extractDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    
    // Handle BigQuery timestamp object (has .value property)
    let dateStr: string | null = null;
    if (typeof dateField === 'object' && dateField !== null && 'value' in dateField) {
      dateStr = dateField.value;
    } else if (typeof dateField === 'string') {
      dateStr = dateField;
    } else {
      return null;
    }
    
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateStr);
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Error parsing date:', dateStr, error);
      return null;
    }
  };

  // Calculate filtered counts for current period - use useMemo for reactivity
  const { filteredPapersCount, filteredArticlesCount, filteredPostsCount } = useMemo(() => {
    const currentPeriodStart = subDays(new Date(), parseInt(dateRange));
    
    const papersCount = papers.filter(p => {
      const date = extractDate(p.published_at);
      if (!date) {
        console.warn('Paper missing date:', p.paper_id, p.published_at);
        return false;
      }
      return date >= currentPeriodStart;
    }).length;
    
    const articlesCount = articles.filter(a => {
      const date = extractDate(a.published_at);
      if (!date) return false;
      return date >= currentPeriodStart;
    }).length;
    
    const postsCount = posts.filter(p => {
      const date = extractDate(p.created_utc);
      if (!date) return false;
      return date >= currentPeriodStart;
    }).length;
    
    console.log('Filtered counts:', {
      papers: { total: papers.length, filtered: papersCount },
      articles: { total: articles.length, filtered: articlesCount },
      posts: { total: posts.length, filtered: postsCount },
      dateRange,
      currentPeriodStart: currentPeriodStart.toISOString()
    });
    
    return {
      filteredPapersCount: papersCount,
      filteredArticlesCount: articlesCount,
      filteredPostsCount: postsCount
    };
  }, [papers, articles, posts, dateRange]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Page Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <h1 className="font-display text-4xl font-bold text-gradient">
                  Trending Topics
                </h1>
              </div>
              <p className="text-muted-foreground text-lg ml-14">
                Discover trending topics across Arxiv papers, news articles, and Reddit discussions
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAllData}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>

          {/* Time Period Filter */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Time Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["7", "14", "30", "60", "90"].map((days) => (
                  <Badge
                    key={days}
                    variant={dateRange === days ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2"
                    onClick={() => setDateRange(days)}
                  >
                    Last {days} days
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card className="border-2 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Data Summary
                </span>
                {dataLoaded && (
                  <Badge variant="outline" className="text-xs">
                    Last updated: {new Date().toLocaleTimeString()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center p-4 rounded-lg bg-card border border-border/50"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-3xl font-bold text-gradient">{totalPapersCount > 0 ? totalPapersCount.toLocaleString() : papers.length.toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Arxiv Papers</div>
                  {papers.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {filteredPapersCount} in last {dateRange} days
                    </div>
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center p-4 rounded-lg bg-card border border-border/50"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Newspaper className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="text-3xl font-bold text-gradient">{totalArticlesCount > 0 ? totalArticlesCount.toLocaleString() : articles.length.toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">News Articles</div>
                  {articles.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {filteredArticlesCount} in last {dateRange} days
                    </div>
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center p-4 rounded-lg bg-card border border-border/50"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <div className="text-3xl font-bold text-gradient">{totalPostsCount > 0 ? totalPostsCount.toLocaleString() : posts.length.toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Reddit Posts</div>
                  {posts.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {filteredPostsCount} in last {dateRange} days
                    </div>
                  )}
                </motion.div>
              </div>
              {!dataLoaded && !loading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Click "Refresh Data" to load data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {fetchError && (
            <Card className="border-2 border-red-500/20">
              <CardContent className="pt-6">
                <div className="text-center text-red-600 dark:text-red-400">
                  <p className="font-semibold">Error loading data</p>
                  <p className="text-sm text-muted-foreground mt-2">{fetchError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : dataLoaded && (
            <>
              {/* Top Trending */}
              {topTrending.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-2 border-green-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        🔥 Hot & Rising
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Topics with the biggest growth
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topTrending.map((trend, index) => (
                          <motion.div
                            key={`${trend.tag}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                #{index + 1}
                              </div>
                              <div className="flex items-center gap-2">
                                {getSourceIcon(trend.source)}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-lg mb-1">{getCleanTag(trend.tag)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {trend.current} items (was {trend.previous}) • {getSourceLabel(trend.tag)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                                <ArrowUp className="h-5 w-5" />
                                <span className="text-xl">+{trend.changePercent.toFixed(1)}%</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                +{trend.change} items
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Declining */}
              {declining.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-2 border-red-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        📉 Declining
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Topics seeing decreased activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {declining.map((trend, index) => (
                          <motion.div
                            key={`${trend.tag}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                #{index + 1}
                              </div>
                              <div className="flex items-center gap-2">
                                {getSourceIcon(trend.source)}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-lg mb-1">{getCleanTag(trend.tag)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {trend.current} items (was {trend.previous}) • {getSourceLabel(trend.tag)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                                <ArrowDown className="h-5 w-5" />
                                <span className="text-xl">{trend.changePercent.toFixed(1)}%</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {trend.change} items
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* All Trends Table */}
              {trends.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        All Topic Trends
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Complete breakdown of all topics across data sources
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-3 font-semibold">Topic</th>
                              <th className="text-left p-3 font-semibold">Source</th>
                              <th className="text-center p-3 font-semibold">Current</th>
                              <th className="text-center p-3 font-semibold">Previous</th>
                              <th className="text-center p-3 font-semibold">Change</th>
                              <th className="text-center p-3 font-semibold">Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trends.map((trend, idx) => (
                              <tr key={`${trend.tag}-${idx}`} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                <td className="p-3 font-medium">{getCleanTag(trend.tag)}</td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {getSourceIcon(trend.source)}
                                    <span className="text-sm text-muted-foreground">{getSourceLabel(trend.tag)}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">{trend.current}</td>
                                <td className="p-3 text-center text-muted-foreground">{trend.previous}</td>
                                <td className="p-3 text-center">
                                  <span className={trend.change > 0 ? 'text-green-600 dark:text-green-400' : trend.change < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}>
                                    {trend.change > 0 ? '+' : ''}{trend.change}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {trend.change > 0 ? (
                                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                                      <ArrowUp className="h-4 w-4" />
                                      <span className="text-sm font-medium">+{trend.changePercent.toFixed(1)}%</span>
                                    </div>
                                  ) : trend.change < 0 ? (
                                    <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                                      <ArrowDown className="h-4 w-4" />
                                      <span className="text-sm font-medium">{trend.changePercent.toFixed(1)}%</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                      <Minus className="h-4 w-4" />
                                      <span className="text-sm">0%</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Tag Analysis Section */}
              {tagAnalysis.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-6"
                >
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        Tag Distribution Analysis
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Overall tag distribution across all data sources
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div>
                          <h3 className="text-sm font-semibold mb-4">Top Tags Distribution</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={tagAnalysis.slice(0, 10).map((item, idx) => ({
                                  name: item.tag,
                                  value: item.total,
                                  fill: COLORS[idx % COLORS.length]
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {tagAnalysis.slice(0, 10).map((_, idx) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Bar Chart */}
                        <div>
                          <h3 className="text-sm font-semibold mb-4">Tag Count by Source</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={tagAnalysis.slice(0, 10)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="tag" 
                                angle={-45} 
                                textAnchor="end" 
                                height={100}
                                className="text-xs"
                              />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="arxiv" stackId="a" fill={COLORS[0]} name="Arxiv" />
                              <Bar dataKey="news" stackId="a" fill={COLORS[1]} name="News" />
                              <Bar dataKey="reddit" stackId="a" fill={COLORS[2]} name="Reddit" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tag Analysis Table */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Complete Tag Analysis
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Detailed breakdown of all tags across sources
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-3 font-semibold">Tag</th>
                              <th className="text-center p-3 font-semibold">Total</th>
                              <th className="text-center p-3 font-semibold">Arxiv</th>
                              <th className="text-center p-3 font-semibold">News</th>
                              <th className="text-center p-3 font-semibold">Reddit</th>
                              <th className="text-center p-3 font-semibold">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tagAnalysis.map((analysis, idx) => (
                              <tr key={analysis.tag} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                <td className="p-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    {analysis.tag}
                                  </div>
                                </td>
                                <td className="p-3 text-center font-semibold">{analysis.total}</td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <BookOpen className="h-3 w-3 text-muted-foreground" />
                                    {analysis.arxiv}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Newspaper className="h-3 w-3 text-muted-foreground" />
                                    {analysis.news}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                    {analysis.reddit}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all"
                                        style={{ 
                                          width: `${analysis.percentage}%`,
                                          backgroundColor: COLORS[idx % COLORS.length]
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                      {analysis.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {trends.length === 0 && !loading && dataLoaded && (
                <Card className="border-2">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-2">No trend data available for the selected period and source.</p>
                    <p className="text-sm text-muted-foreground">
                      Total items: {papers.length + articles.length + posts.length} 
                      ({papers.length} papers, {articles.length} articles, {posts.length} posts)
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Try selecting a different time period or data source.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
