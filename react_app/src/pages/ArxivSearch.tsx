import { useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, FileText, ExternalLink, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { getApiUrl } from "@/lib/apiUrl";

interface ArxivResult {
  title: string;
  summary: string;
  pdf_url: string;
  published_date: string;
  distance: number;
}

export default function ArxivSearch() {
  const [searchQuery, setSearchQuery] = useState("neural networks for dynamical systems");
  const [distanceThreshold, setDistanceThreshold] = useState(0.6);
  const [daysBack, setDaysBack] = useState(7);
  const [results, setResults] = useState<ArxivResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          distanceThreshold,
          daysBack,
          limit: 10
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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
          {/* Page Header */}
          <div>
            <h1 className="font-display text-4xl font-bold mb-4 text-gradient">
              🔬 Arxiv Semantic Search
            </h1>
            <p className="text-muted-foreground text-lg">
              Find relevant research papers using AI-powered semantic similarity
            </p>
          </div>

          {/* Search Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Search Research Papers</CardTitle>
              <CardDescription>
                Enter your search query to find semantically similar papers from arXiv
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Query</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="e.g., neural networks for dynamical systems"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distance Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Distance Threshold</label>
                    <Badge variant="secondary">{distanceThreshold.toFixed(2)}</Badge>
                  </div>
                  <Slider
                    value={[distanceThreshold]}
                    onValueChange={(value) => setDistanceThreshold(value[0])}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower values = stricter matching (0.1 very strict, 1.0 very loose)
                  </p>
                </div>

                {/* Days Back */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Time Range</label>
                  <Select
                    value={daysBack.toString()}
                    onValueChange={(value) => setDaysBack(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last 24 hours</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only search papers published within this timeframe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                {isLoading 
                  ? 'Searching...' 
                  : hasSearched 
                    ? `Found ${results.length} semantically similar paper(s)`
                    : 'Enter a query to start searching'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>Error: {error}</AlertDescription>
                </Alert>
              )}

              {!isLoading && !error && hasSearched && results.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No results found. Try adjusting your search query or distance threshold.
                  </p>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="space-y-4">
                  {results.map((paper, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 rounded-lg border border-border hover:bg-muted/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {paper.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={paper.distance < 0.3 ? "default" : paper.distance < 0.5 ? "secondary" : "outline"}
                          >
                            {(paper.distance * 100).toFixed(1)}% distance
                          </Badge>
                          <a
                            href={paper.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {paper.summary}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Published: {format(new Date(paper.published_date), 'MMM dd, yyyy')}
                        </span>
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View PDF →
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Semantic Search:</strong> Uses AI embeddings to find papers based on meaning, not just keywords.
              </p>
              <p>
                <strong className="text-foreground">Distance Score:</strong> Measures how semantically similar papers are (lower = more similar).
              </p>
              <p>
                <strong className="text-foreground">ML Model:</strong> Powered by BigQuery ML's GENERATE_EMBEDDING function with cosine distance.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
