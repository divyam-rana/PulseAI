import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStats, useTags, useNewsletters } from "@/hooks/useBigQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, Tag, Share2, Download, RefreshCw, BookOpen, Newspaper, MessageSquare, Cloud } from "lucide-react";
import { format, subDays } from "date-fns";
import { Wordcloud } from '@visx/wordcloud';
import { scaleLog } from '@visx/scale';
import { Text } from '@visx/text';

const COLORS = ['#0EA5E9', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316'];

interface BrowseAnalytics {
  papers: {
    total: number;
    categories: number;
    tag_distribution: Array<{ tag: string; count: number }>;
  };
  articles: {
    total: number;
    sources: number;
    tag_distribution: Array<{ tag: string; count: number }>;
  };
  posts: {
    total: number;
    authors: number;
    tag_distribution: Array<{ tag: string; count: number }>;
  };
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedTag, setSelectedTag] = useState("all");
  const [chartType, setChartType] = useState("bar");
  const [browseAnalytics, setBrowseAnalytics] = useState<BrowseAnalytics | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  
  const { data: stats, isLoading: statsLoading, error: statsError, refetch } = useStats();
  const { data: tagsData } = useTags();
  const { data: newslettersData } = useNewsletters({ 
    limit: 1000,
    tag: selectedTag !== "all" ? selectedTag : undefined
  });
  
  const newsletters = newslettersData?.data || [];
  const availableTags = tagsData?.tags || [];

  // Fetch browse analytics
  useEffect(() => {
    const fetchBrowseAnalytics = async () => {
      setBrowseLoading(true);
      try {
        const response = await fetch('http://localhost:3001/api/browse-analytics');
        if (!response.ok) throw new Error('Failed to fetch browse analytics');
        const data = await response.json();
        setBrowseAnalytics(data);
      } catch (error) {
        console.error('Error fetching browse analytics:', error);
      } finally {
        setBrowseLoading(false);
      }
    };
    fetchBrowseAnalytics();
  }, []);
  
  // Filter by date range
  const cutoffDate = subDays(new Date(), parseInt(dateRange));
  const filteredNewsletters = newsletters.filter(n => 
    new Date(n.window_end) >= cutoffDate
  );
  
  // Calculate filtered stats
  const filteredTagDistribution = filteredNewsletters.reduce((acc: Record<string, number>, newsletter) => {
    acc[newsletter.tag] = (acc[newsletter.tag] || 0) + 1;
    return acc;
  }, {});

  const tagDistributionData = Object.entries(filteredTagDistribution).map(([tag, count]) => ({
    tag,
    count
  })).sort((a, b) => b.count - a.count);

  const pieChartData = tagDistributionData.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));
  
  // Process data for time series
  const timeSeriesData = filteredNewsletters.reduce((acc: Record<string, number>, newsletter) => {
    const date = format(new Date(newsletter.window_end), 'MMM dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  const chartData = Object.entries(timeSeriesData)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 data points

  // Calculate metrics from filtered data
  const filteredEarliestDate = filteredNewsletters.length > 0 
    ? filteredNewsletters.reduce((earliest, n) => 
        new Date(n.window_end) < new Date(earliest) ? n.window_end : earliest
      , filteredNewsletters[0].window_end)
    : null;

  const filteredLatestDate = filteredNewsletters.length > 0
    ? filteredNewsletters.reduce((latest, n) => 
        new Date(n.window_end) > new Date(latest) ? n.window_end : latest
      , filteredNewsletters[0].window_end)
    : null;

  // Prepare word cloud data from all tags across newsletters and browse content
  const wordCloudData = [
    ...tagDistributionData.map(({ tag, count }) => ({ text: tag, value: count })),
    ...(browseAnalytics?.papers.tag_distribution.map(({ tag, count }) => ({ text: tag, value: count })) || []),
    ...(browseAnalytics?.articles.tag_distribution.map(({ tag, count }) => ({ text: tag, value: count })) || []),
    ...(browseAnalytics?.posts.tag_distribution.map(({ tag, count }) => ({ text: tag, value: count })) || [])
  ].reduce((acc: Array<{text: string; value: number}>, item) => {
    const existing = acc.find(i => i.text === item.text);
    if (existing) {
      existing.value += item.value;
    } else {
      acc.push({ text: item.text, value: item.value });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 50);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'PulseAI Analytics Dashboard',
        text: `Check out these insights: ${stats?.total_newsletters} newsletters across ${stats?.total_tags} categories!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleExportData = () => {
    const data = {
      stats,
      newsletters: filteredNewsletters,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseai-analytics-${Date.now()}.json`;
    a.click();
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 lg:px-8 py-24">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 lg:px-8 py-24">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load analytics data. Error: {statsError.message}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Page Header with Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2 text-gradient">
                📊 Analytics Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Real-time insights and visualizations from your newsletter content
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Customize your analytics view</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">Chart Type</label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Newsletters</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient">
                    {filteredNewsletters.length.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedTag !== "all" ? `In ${selectedTag}` : "Across all categories"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient">
                    {Object.keys(filteredTagDistribution).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dateRange} days
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Latest</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredLatestDate ? format(new Date(filteredLatestDate), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Most recent newsletter
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Earliest</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEarliestDate ? format(new Date(filteredEarliestDate), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Oldest in range
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tag Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Tag Distribution</CardTitle>
                  <CardDescription>Newsletter count by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tagDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="tag" className="text-xs" angle={-45} textAnchor="end" height={100} />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tag Distribution Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>Percentage distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ tag, percent }) => `${tag}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Time Series */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Newsletter Timeline</CardTitle>
                  <CardDescription>Publishing activity over time (last 30 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Word Cloud */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Tag Word Cloud
                </CardTitle>
                <CardDescription>Visual representation of all tags across content types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[400px] flex items-center justify-center">
                  {wordCloudData.length > 0 ? (
                    <Wordcloud
                      words={wordCloudData}
                      width={800}
                      height={400}
                      fontSize={(datum) => Math.log2(datum.value) * 10}
                      font={'Arial'}
                      padding={2}
                      spiral={'archimedean'}
                      rotate={0}
                      random={() => 0.5}
                    >
                      {(cloudWords) =>
                        cloudWords.map((w, i) => (
                          <Text
                            key={w.text}
                            fill={COLORS[i % COLORS.length]}
                            textAnchor={'middle'}
                            transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                            fontSize={w.size}
                            fontFamily={w.font}
                          >
                            {w.text}
                          </Text>
                        ))
                      }
                    </Wordcloud>
                  ) : (
                    <div className="text-muted-foreground">Loading word cloud...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Browse Content Analytics */}
          {browseAnalytics && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <h2 className="text-2xl font-bold mb-4">Browse Content Analytics</h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Papers Analytics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Research Papers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-gradient">
                          {browseAnalytics.papers.total.toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Papers</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{browseAnalytics.papers.categories}</div>
                        <p className="text-sm text-muted-foreground">Categories</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-sm font-medium mb-2">Top Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {browseAnalytics.papers.tag_distribution.slice(0, 5).map((item) => (
                            <span key={item.tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {item.tag} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* News Analytics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Newspaper className="h-5 w-5" />
                        News Articles
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-gradient">
                          {browseAnalytics.articles.total.toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Articles</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{browseAnalytics.articles.sources}</div>
                        <p className="text-sm text-muted-foreground">Sources</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-sm font-medium mb-2">Top Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {browseAnalytics.articles.tag_distribution.slice(0, 5).map((item) => (
                            <span key={item.tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {item.tag} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Reddit Analytics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Reddit Posts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-gradient">
                          {browseAnalytics.posts.total.toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Posts</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{browseAnalytics.posts.authors}</div>
                        <p className="text-sm text-muted-foreground">Authors</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-sm font-medium mb-2">Top Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {browseAnalytics.posts.tag_distribution.slice(0, 5).map((item) => (
                            <span key={item.tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {item.tag} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
