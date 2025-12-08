import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Bookmark, Share2 } from "lucide-react";
import { Newsletter } from "@/types/newsletter";
import { TagBadge } from "./TagBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

interface NewsletterCardProps {
  newsletter: Newsletter;
  index: number;
  onClick: () => void;
}

function calculateReadingTime(content: string | null | undefined): number {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function getExcerpt(content: string | null | undefined, maxLength = 160): string {
  if (!content) return "No content available";
  
  // Remove markdown headers and get plain text
  const plainText = content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
  
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + "...";
}

export function NewsletterCard({ newsletter, index, onClick }: NewsletterCardProps) {
  const readingTime = calculateReadingTime(newsletter.content);
  const excerpt = getExcerpt(newsletter.content);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/newsletters?tag=${encodeURIComponent(newsletter.tag)}&date=${encodeURIComponent(newsletter.window_end)}`;
    const shareText = `Check out the ${newsletter.tag} Weekly Digest from PulseAI!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${newsletter.tag} Weekly Digest`,
          text: shareText,
          url: shareUrl
        });
        toast.success("Newsletter shared successfully!");
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          // If not cancelled, fallback to clipboard
          navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Store in localStorage
    const bookmarks = JSON.parse(localStorage.getItem('pulseai-bookmarks') || '[]');
    const isBookmarked = bookmarks.some((b: Newsletter) => 
      b.tag === newsletter.tag && b.window_end === newsletter.window_end
    );
    
    if (isBookmarked) {
      const filtered = bookmarks.filter((b: Newsletter) => 
        !(b.tag === newsletter.tag && b.window_end === newsletter.window_end)
      );
      localStorage.setItem('pulseai-bookmarks', JSON.stringify(filtered));
      alert('Removed from bookmarks');
    } else {
      bookmarks.push(newsletter);
      localStorage.setItem('pulseai-bookmarks', JSON.stringify(bookmarks));
      alert('Added to bookmarks!');
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative bg-glass border border-border/50 rounded-2xl overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow Effect */}
      <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/20 via-transparent to-violet-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <TagBadge tag={newsletter.tag} size="md" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleBookmark}
            >
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display text-xl font-semibold mb-3 group-hover:text-gradient transition-all duration-300">
          {newsletter.tag} Weekly Digest
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
          {excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(newsletter.window_end), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{readingTime} min read</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Read More
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
