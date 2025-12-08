import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Download, Filter as FilterIcon, ExternalLink, Loader2, BookOpen, Newspaper, MessageSquare, Calendar, User } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useNewsletters, useTags } from "@/hooks/useBigQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Newsletter } from "@/types/newsletter";
import { TAG_COLORS } from "@/lib/tagColors";
import { getApiUrl } from "@/lib/apiUrl";
import { toast } from "sonner";
import { NewsletterModal } from "@/components/newsletter/NewsletterModal";

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

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [browseSearchQuery, setBrowseSearchQuery] = useState("");
  const [selectedBrowseTag, setSelectedBrowseTag] = useState<string>("all");
  
  // Newsletter modal state
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  
  const [papersLoading, setPapersLoading] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  
  const [papersError, setPapersError] = useState<string | null>(null);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  const { data: tagsData } = useTags();
  const availableTags = tagsData?.tags || [];

  const queryParams = {
    limit: 500,
    search: searchQuery || undefined,
    tag: selectedTags.length === 1 ? selectedTags[0] : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data: results, isLoading, error } = useNewsletters(queryParams);
  const newsletters = results?.data || [];

  const filteredResults = newsletters.filter((n: Newsletter) => 
    selectedTags.length === 0 || selectedTags.includes(n.tag)
  );

  const allBrowseTags = Array.from(new Set([
    ...papers.flatMap(p => p.tags || []),
    ...articles.flatMap(a => a.tags || []),
    ...posts.flatMap(p => p.tags || [])
  ])).sort();

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Date unavailable';
    }
  };

  const renderMarkdown = (content: string): string => {
    if (!content) return '';
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-3 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br />');
  };

  const getTagColor = (tag: string): "default" | "secondary" | "outline" | "destructive" => {
    // Return a valid Badge variant based on tag
    const tagKey = tag as keyof typeof TAG_COLORS;
    if (TAG_COLORS[tagKey]) {
      return 'default';
    }
    return 'outline';
  };

  useEffect(() => {
    const fetchPapers = async () => {
      setPapersLoading(true);
      setPapersError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedBrowseTag !== 'all') params.append('tag', selectedBrowseTag);
        if (browseSearchQuery) params.append('search', browseSearchQuery);
        
        const response = await fetch(`${getApiUrl()}/api/arxiv-papers?${params}`);
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
  }, [selectedBrowseTag, browseSearchQuery]);

  useEffect(() => {
    const fetchArticles = async () => {
      setArticlesLoading(true);
      setArticlesError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedBrowseTag !== 'all') params.append('tag', selectedBrowseTag);
        if (browseSearchQuery) params.append('search', browseSearchQuery);
        
        const response = await fetch(`${getApiUrl()}/api/news-articles?${params}`);
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
  }, [selectedBrowseTag, browseSearchQuery]);

  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (selectedBrowseTag !== 'all') params.append('tag', selectedBrowseTag);
        if (browseSearchQuery) params.append('search', browseSearchQuery);
        
        const response = await fetch(`${getApiUrl()}/api/reddit-posts?${params}`);
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
  }, [selectedBrowseTag, browseSearchQuery]);

  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      toast.error('No results to export');
      return;
    }
    
    const headers = ['Tag', 'Window Start', 'Window End', 'Content', 'Created At'];
    const csvData = filteredResults.map((n: Newsletter) => [
      n.tag,
      n.window_start,
      n.window_end,
      `"${n.content?.replace(/"/g, '""')}"`,
      n.created_at
    ]);
    
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseai-search-${Date.now()}.csv`;
    a.click();
    toast.success(`Exported ${filteredResults.length} results to CSV`);
  };

  const handleExportJSON = () => {
    if (filteredResults.length === 0) {
      toast.error('No results to export');
      return;
    }
    
    const json = JSON.stringify(filteredResults, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseai-search-${Date.now()}.json`;
    a.click();
    toast.success(`Exported ${filteredResults.length} results to JSON`);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const openNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setIsModalOpen(true);
  };

  const closeNewsletter = () => {
    setIsModalOpen(false);
    setSelectedNewsletter(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SearchIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display text-4xl font-bold text-gradient">
                Universal Search
              </h1>
            </div>
            <p className="text-muted-foreground text-lg ml-14">
              Search newsletters, research papers, news articles, and community discussions
            </p>
          </div>

          <Tabs defaultValue="newsletters" className="space-y-6">
            <TabsList className="grid w-full max-w-4xl grid-cols-4">
              <TabsTrigger value="newsletters">📰 Newsletters</TabsTrigger>
              <TabsTrigger value="papers">📚 Papers</TabsTrigger>
              <TabsTrigger value="news">📰 News</TabsTrigger>
              <TabsTrigger value="reddit">💬 Reddit</TabsTrigger>
            </TabsList>

            <TabsContent value="newsletters" className="space-y-6">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FilterIcon className="h-5 w-5 text-primary" />
                    Newsletter Search
                  </CardTitle>
                  <CardDescription className="mt-1">Search and filter across all newsletter content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search newsletters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FilterIcon className="h-4 w-4" />
                      Filter by Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => {
                      setSearchQuery("");
                      setSelectedTags([]);
                      setStartDate("");
                      setEndDate("");
                    }} variant="outline">
                      Clear Filters
                    </Button>
                    <Button onClick={handleExportCSV} variant="outline" className="gap-2" disabled={filteredResults.length === 0}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button onClick={handleExportJSON} variant="outline" className="gap-2" disabled={filteredResults.length === 0}>
                      <Download className="h-4 w-4" />
                      Export JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Newspaper className="h-5 w-5 text-primary" />
                        Search Results
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {isLoading ? 'Searching...' : `Found ${filteredResults.length} newsletter${filteredResults.length !== 1 ? 's' : ''}`}
                      </CardDescription>
                    </div>
                    {!isLoading && filteredResults.length > 0 && (
                      <Badge variant="outline" className="text-sm">
                        {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading && (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="border-2">
                          <CardHeader>
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-16 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>Error: {error.message}</AlertDescription>
                    </Alert>
                  )}

                  {!isLoading && !error && filteredResults.length === 0 && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                        <SearchIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No results found</h3>
                      <p className="text-muted-foreground mb-4">Try adjusting your search query or filters</p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedTags([]);
                          setStartDate("");
                          setEndDate("");
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )}

                  {!isLoading && !error && filteredResults.length > 0 && (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {filteredResults.map((newsletter: Newsletter, index: number) => (
                        <motion.div
                          key={`${newsletter.tag}-${newsletter.window_end}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <Card 
                            className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer"
                            onClick={() => openNewsletter(newsletter)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge 
                                      variant="outline" 
                                      className="font-semibold"
                                    >
                                      {newsletter.tag}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(newsletter.window_end), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                  <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                                    {newsletter.tag} Newsletter
                                  </CardTitle>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div 
                                className="text-sm text-muted-foreground leading-relaxed line-clamp-4 mb-4 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(newsletter.content?.substring(0, 400) || 'No content available') + 
                                    (newsletter.content && newsletter.content.length > 400 ? '...' : '')
                                }}
                              />
                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div className="text-xs text-muted-foreground">
                                  {newsletter.content ? `${Math.ceil(newsletter.content.length / 200)} min read` : 'No content'}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNewsletter(newsletter);
                                  }}
                                >
                                  View Details
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="papers" className="space-y-6">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Arxiv Research Papers
                  </CardTitle>
                  <CardDescription className="mt-1">Browse and search tagged research papers from arXiv</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by title or abstract..."
                        value={browseSearchQuery}
                        onChange={(e) => setBrowseSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedBrowseTag} onValueChange={setSelectedBrowseTag}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allBrowseTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Research Papers ({papers.length})
                  </CardTitle>
                  <CardDescription>
                    {papersLoading ? 'Loading...' : `Showing ${papers.length} paper(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {papersLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {papersError && (
                    <Alert variant="destructive">
                      <AlertDescription>Error: {papersError}</AlertDescription>
                    </Alert>
                  )}

                  {!papersLoading && !papersError && papers.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No papers found. Try adjusting your filters.</p>
                    </div>
                  )}

                  {!papersLoading && !papersError && papers.length > 0 && (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {papers.map((paper) => (
                        <motion.div
                          key={paper.paper_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group"
                        >
                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                  <a
                                    href={`https://arxiv.org/abs/${paper.paper_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2"
                                  >
                                    {paper.title}
                                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                                  </a>
                                </CardTitle>
                              </div>
                              <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(paper.published_at)}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                {paper.abstract}
                              </p>
                              {paper.tags && paper.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {paper.tags.map((tag) => (
                                    <Badge key={tag} variant={getTagColor(tag) as "default" | "secondary" | "outline" | "destructive"}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news" className="space-y-6">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-primary" />
                    News Articles
                  </CardTitle>
                  <CardDescription className="mt-1">Browse and search tagged news articles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by title or description..."
                        value={browseSearchQuery}
                        onChange={(e) => setBrowseSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedBrowseTag} onValueChange={setSelectedBrowseTag}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allBrowseTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    News Articles ({articles.length})
                  </CardTitle>
                  <CardDescription>
                    {articlesLoading ? 'Loading...' : `Showing ${articles.length} article(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {articlesLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {articlesError && (
                    <Alert variant="destructive">
                      <AlertDescription>Error: {articlesError}</AlertDescription>
                    </Alert>
                  )}

                  {!articlesLoading && !articlesError && articles.length === 0 && (
                    <div className="text-center py-12">
                      <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No articles found. Try adjusting your filters.</p>
                    </div>
                  )}

                  {!articlesLoading && !articlesError && articles.length > 0 && (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {articles.map((article) => (
                        <motion.div
                          key={article.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group"
                        >
                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-2"
                                >
                                  {article.title}
                                  <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                                </a>
                              </CardTitle>
                              <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(article.published_at)}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                {article.description}
                              </p>
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {article.tags.map((tag) => (
                                    <Badge key={tag} variant={getTagColor(tag) as "default" | "secondary" | "outline" | "destructive"}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reddit" className="space-y-6">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Reddit Discussions
                  </CardTitle>
                  <CardDescription className="mt-1">Browse and search tagged Reddit posts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by title..."
                        value={browseSearchQuery}
                        onChange={(e) => setBrowseSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedBrowseTag} onValueChange={setSelectedBrowseTag}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allBrowseTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Reddit Posts ({posts.length})
                  </CardTitle>
                  <CardDescription>
                    {postsLoading ? 'Loading...' : `Showing ${posts.length} post(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {postsLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {postsError && (
                    <Alert variant="destructive">
                      <AlertDescription>Error: {postsError}</AlertDescription>
                    </Alert>
                  )}

                  {!postsLoading && !postsError && posts.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No posts found. Try adjusting your filters.</p>
                    </div>
                  )}

                  {!postsLoading && !postsError && posts.length > 0 && (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {posts.map((post) => (
                        <motion.div
                          key={post.post_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group"
                        >
                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                <a
                                  href={`https://reddit.com/${post.post_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-2"
                                >
                                  {post.title}
                                  <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                                </a>
                              </CardTitle>
                              <CardDescription className="flex flex-wrap items-center gap-3 mt-2">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Author ID: {post.author_sk}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(post.created_utc)}
                                </span>
                              </CardDescription>
                            </CardHeader>
                            {post.tags && post.tags.length > 0 && (
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {post.tags.map((tag) => (
                                    <Badge key={tag} variant={getTagColor(tag) as "default" | "secondary" | "outline" | "destructive"}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />

      {/* Newsletter Modal */}
      <NewsletterModal
        newsletter={selectedNewsletter}
        isOpen={isModalOpen}
        onClose={closeNewsletter}
      />
    </div>
  );
}
