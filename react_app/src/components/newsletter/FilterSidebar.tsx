import { motion } from "framer-motion";
import { Filter, X, CalendarDays, Tag, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagBadge } from "./TagBadge";
import { FilterState, SortOption } from "@/types/newsletter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableTags: string[];
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  availableTags,
  sortOption,
  onSortChange,
  isMobile = false,
  onClose,
}: FilterSidebarProps) {
  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const resetFilters = () => {
    onFiltersChange({
      tags: [],
      dateRange: { start: null, end: null },
      searchQuery: "",
    });
  };

  const hasActiveFilters = filters.tags.length > 0 || filters.dateRange.start || filters.dateRange.end;

  return (
    <motion.aside
      initial={{ opacity: 0, x: isMobile ? 300 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isMobile ? 300 : -20 }}
      className={cn(
        "bg-glass border border-border/50 rounded-2xl p-6",
        isMobile ? "fixed inset-y-0 right-0 w-80 z-50 rounded-none" : ""
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold">Filters</h3>
        </div>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="w-full mb-6 text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      )}

      {/* Sort Options */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Sort By</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "tag", label: "Tag" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={sortOption === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange(option.value as SortOption)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-muted-foreground">Categories</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              size="md"
              interactive
              selected={filters.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-muted-foreground">Date Range</h4>
        </div>
        <div className="space-y-3">
          {/* Start Date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {filters.dateRange.start ? (
                    format(filters.dateRange.start, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.start || undefined}
                  onSelect={(date) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: date || null },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {filters.dateRange.end ? (
                    format(filters.dateRange.end, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.end || undefined}
                  onSelect={(date) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: date || null },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
