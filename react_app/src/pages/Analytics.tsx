import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useStats, useTags, useNewsletters } from "@/hooks/useBigQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, Calendar, Tag, Share2, Download, RefreshCw, BookOpen, Newspaper, MessageSquare, Activity, BarChart3, PieChart as PieChartIcon, Sparkles, Clock, Filter as FilterIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { getApiUrl } from '@/lib/apiUrl';
import { toast } from "sonner";

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
        const response = await fetch(`${getApiUrl()}/api/browse-analytics`);
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

  // Calculate growth metrics
  const previousPeriodStart = subDays(new Date(), parseInt(dateRange) * 2);
  const previousPeriodEnd = subDays(new Date(), parseInt(dateRange));
  const previousPeriodNewsletters = newsletters.filter(n => {
    const date = new Date(n.window_end);
    return date >= previousPeriodStart && date < previousPeriodEnd;
  });
  
  const currentCount = filteredNewsletters.length;
  const previousCount = previousPeriodNewsletters.length;
  const growthRate = previousCount > 0 
    ? ((currentCount - previousCount) / previousCount) * 100 
    : 0;

  // Calculate average newsletters per week
  const weeksInRange = parseInt(dateRange) / 7;
  const avgPerWeek = weeksInRange > 0 ? (currentCount / weeksInRange).toFixed(1) : '0';

  // Top performing tags
  const topTags = tagDistributionData.slice(0, 5);

  // Calculate content statistics
  const totalContentLength = filteredNewsletters.reduce((sum, n) => 
    sum + (n.content?.length || 0), 0
  );
  const avgContentLength = filteredNewsletters.length > 0 
    ? Math.round(totalContentLength / filteredNewsletters.length) 
    : 0;

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'PulseAI Analytics Dashboard',
        text: `Check out these insights: ${stats?.total_newsletters} newsletters across ${stats?.total_tags} categories!`,
        url: window.location.href
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
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
    toast.success('Analytics data exported successfully!');
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="font-display text-4xl font-bold text-gradient">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground text-lg ml-14">
                Real-time insights and visualizations from your newsletter content
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                refetch();
                toast.info('Refreshing analytics data...');
              }} className="gap-2">
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
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FilterIcon className="h-5 w-5 text-primary" />
                Filters
              </CardTitle>
              <CardDescription className="mt-1">Customize your analytics view</CardDescription>
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
                <Select value={chartType} onValueChange={(value) => {
                  setChartType(value);
                  toast.info(`Switched to ${value === 'bar' ? 'Bar' : value === 'line' ? 'Line' : 'Area'} chart`);
                }}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Total Newsletters</CardTitle>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Newspaper className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-gradient mb-1">
                    {filteredNewsletters.length.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedTag !== "all" ? `In ${selectedTag}` : "Across all categories"}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>Active</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-gradient mb-1">
                    {Object.keys(filteredTagDistribution).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unique categories
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span>Last {dateRange} days</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Latest</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold mb-1">
                    {filteredLatestDate ? format(new Date(filteredLatestDate), 'MMM d') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Most recent newsletter
                  </p>
                  {filteredLatestDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(filteredLatestDate), 'yyyy')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Earliest</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold mb-1">
                    {filteredEarliestDate ? format(new Date(filteredEarliestDate), 'MMM d') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Oldest in range
                  </p>
                  {filteredEarliestDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(filteredEarliestDate), 'yyyy')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    {growthRate >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className={`text-3xl font-bold mb-1 ${growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    vs previous {dateRange} days
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Avg per Week</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-gradient mb-1">
                    {avgPerWeek}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Newsletters per week
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Avg Content Length</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-gradient mb-1">
                    {avgContentLength.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Characters per newsletter
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Top Performing Tags */}
          {topTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-6"
            >
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Top Performing Categories
                  </CardTitle>
                  <CardDescription className="mt-1">Most active categories in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {topTags.map((item, index) => (
                      <div key={item.tag} className="text-center p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="text-2xl font-bold text-gradient mb-1">{item.count}</div>
                        <div className="text-sm font-medium mb-2">{item.tag}</div>
                        <div className="text-xs text-muted-foreground">
                          {((item.count / currentCount) * 100).toFixed(1)}% of total
                        </div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(item.count / currentCount) * 100}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tag Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Tag Distribution
                      </CardTitle>
                      <CardDescription className="mt-1">Newsletter count by category</CardDescription>
                    </div>
                    {chartType === "bar" && (
                      <Badge variant="outline" className="ml-auto">Bar Chart</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    {chartType === "bar" ? (
                      <BarChart data={tagDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="tag" 
                          className="text-xs" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[8, 8, 0, 0]}
                          className="hover:opacity-80 transition-opacity"
                        />
                      </BarChart>
                    ) : chartType === "area" ? (
                      <AreaChart data={tagDistributionData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="tag" 
                          className="text-xs" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorCount)"
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={tagDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="tag" 
                          className="text-xs" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
                    )}
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
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        Category Breakdown
                      </CardTitle>
                      <CardDescription className="mt-1">Percentage distribution</CardDescription>
                    </div>
                    <Badge variant="outline">Pie Chart</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ tag, percent }) => percent > 0.05 ? `${tag}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="count"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-xs">{value}</span>}
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
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Newsletter Timeline
                      </CardTitle>
                      <CardDescription className="mt-1">Publishing activity over time</CardDescription>
                    </div>
                    <Badge variant="outline">Line Chart</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    {chartType === "area" ? (
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorTimeline)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                          activeDot={{ r: 8, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

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
