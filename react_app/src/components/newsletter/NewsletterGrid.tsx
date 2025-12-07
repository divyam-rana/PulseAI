import { motion, AnimatePresence } from "framer-motion";
import { Newsletter, FilterState, SortOption } from "@/types/newsletter";
import { NewsletterCard } from "./NewsletterCard";
import { useMemo } from "react";
import { isWithinInterval, parseISO } from "date-fns";
import { FileX } from "lucide-react";

interface NewsletterGridProps {
  newsletters: Newsletter[];
  filters: FilterState;
  sortOption: SortOption;
  onNewsletterClick: (newsletter: Newsletter) => void;
}

export function NewsletterGrid({
  newsletters,
  filters,
  sortOption,
  onNewsletterClick,
}: NewsletterGridProps) {
  const filteredAndSortedNewsletters = useMemo(() => {
    let filtered = newsletters;

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((n) => filters.tags.includes(n.tag));
    }

    // Filter by date range
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter((n) => {
        const newsletterDate = parseISO(n.window_end);
        const start = filters.dateRange.start || new Date(0);
        const end = filters.dateRange.end || new Date();
        return isWithinInterval(newsletterDate, { start, end });
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.tag.toLowerCase().includes(query) ||
          n.content?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.window_end).getTime() - new Date(a.window_end).getTime();
        case "oldest":
          return new Date(a.window_end).getTime() - new Date(b.window_end).getTime();
        case "tag":
          return a.tag.localeCompare(b.tag);
        default:
          return 0;
      }
    });

    return sorted;
  }, [newsletters, filters, sortOption]);

  if (filteredAndSortedNewsletters.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="p-4 bg-muted rounded-full mb-4">
          <FileX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">No newsletters found</h3>
        <p className="text-muted-foreground max-w-md">
          Try adjusting your filters or search query to find what you're looking for.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {filteredAndSortedNewsletters.map((newsletter, index) => (
          <NewsletterCard
            key={`${newsletter.tag}-${newsletter.window_end}`}
            newsletter={newsletter}
            index={index}
            onClick={() => onNewsletterClick(newsletter)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
