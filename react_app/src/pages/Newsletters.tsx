import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/newsletter/SearchBar";
import { FilterSidebar } from "@/components/newsletter/FilterSidebar";
import { NewsletterGrid } from "@/components/newsletter/NewsletterGrid";
import { NewsletterModal } from "@/components/newsletter/NewsletterModal";
import { StatsBar } from "@/components/newsletter/StatsBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newsletter, FilterState, SortOption } from "@/types/newsletter";
import { useNewsletters, useTags } from "@/hooks/useBigQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Newsletters = () => {
  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    dateRange: { start: null, end: null },
    searchQuery: "",
  });
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params: {
      limit?: number;
      tag?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    } = { limit: 1000 };

    if (filters.tags.length === 1) {
      params.tag = filters.tags[0];
    }

    if (filters.dateRange.start) {
      params.startDate = filters.dateRange.start.toISOString();
    }

    if (filters.dateRange.end) {
      params.endDate = filters.dateRange.end.toISOString();
    }

    if (filters.searchQuery) {
      params.search = filters.searchQuery;
    }

    return params;
  }, [filters]);

  // Fetch data from BigQuery
  const { data: newslettersData, isLoading, error } = useNewsletters(queryParams);
  const { data: tagsData } = useTags();

  const availableTags = tagsData?.tags || [];

  // Client-side filtering for multiple tags
  const filteredNewsletters = useMemo(() => {
    const newsletters = newslettersData?.data || [];
    let filtered = newsletters;

    // If multiple tags selected, filter on client side
    if (filters.tags.length > 1) {
      filtered = filtered.filter((n: Newsletter) => filters.tags.includes(n.tag));
    }

    return filtered;
  }, [newslettersData?.data, filters.tags]);

  // Sorting
  const sortedNewsletters = useMemo(() => {
    const sorted = [...filteredNewsletters];
    
    switch (sortOption) {
      case "newest":
        return sorted.sort((a, b) => 
          new Date(b.window_end).getTime() - new Date(a.window_end).getTime()
        );
      case "oldest":
        return sorted.sort((a, b) => 
          new Date(a.window_end).getTime() - new Date(b.window_end).getTime()
        );
      case "tag":
        return sorted.sort((a, b) => a.tag.localeCompare(b.tag));
      default:
        return sorted;
    }
  }, [filteredNewsletters, sortOption]);

  // Pagination
  const totalPages = Math.ceil(sortedNewsletters.length / itemsPerPage);
  const paginatedNewsletters = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedNewsletters.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedNewsletters, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  const handleSearchChange = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Header */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              AI Newsletter <span className="text-gradient">Archive</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Browse our comprehensive collection of curated AI newsletters covering cutting-edge research, 
              industry trends, and practical applications across multiple domains.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 pb-12 lg:pb-20">
        {/* Search and Filter Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="flex-1">
              <SearchBar value={filters.searchQuery} onChange={handleSearchChange} />
            </div>
            <Button
              variant="glass"
              className="lg:hidden"
              onClick={() => setMobileFilterOpen(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {!isLoading && (
            <StatsBar 
              newsletters={sortedNewsletters} 
              filteredCount={sortedNewsletters.length} 
            />
          )}
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>
              Failed to load newsletters. Make sure the backend server is running on http://localhost:3001
              <br />
              Error: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Content Area */}
        {!isLoading && !error && (
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <FilterSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableTags={availableTags}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                />
              </div>
            </div>

            {/* Newsletter Grid */}
            <div className="flex-1 space-y-6">
              <NewsletterGrid
                newsletters={paginatedNewsletters}
                filters={filters}
                sortOption={sortOption}
                onNewsletterClick={setSelectedNewsletter}
              />

              {/* Pagination Controls */}
              {sortedNewsletters.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, sortedNewsletters.length)} of{" "}
                      {sortedNewsletters.length} results
                    </span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 / page</SelectItem>
                        <SelectItem value="9">9 / page</SelectItem>
                        <SelectItem value="12">12 / page</SelectItem>
                        <SelectItem value="18">18 / page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, idx, arr) => {
                          // Add ellipsis if there's a gap
                          const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                          
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsisBefore && (
                                <span className="px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="min-w-[40px]"
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Filter Sidebar */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <FilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
              sortOption={sortOption}
              onSortChange={setSortOption}
              isMobile
              onClose={() => setMobileFilterOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Newsletter Modal */}
      <NewsletterModal
        newsletter={selectedNewsletter}
        isOpen={!!selectedNewsletter}
        onClose={() => setSelectedNewsletter(null)}
      />

      <Footer />
    </div>
  );
};

export default Newsletters;
