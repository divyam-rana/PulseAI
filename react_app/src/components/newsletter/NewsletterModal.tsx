import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Tag, Share2, Bookmark, ExternalLink, Copy, Check } from "lucide-react";
import { Newsletter } from "@/types/newsletter";
import { TagBadge } from "./TagBadge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface NewsletterModalProps {
  newsletter: Newsletter | null;
  isOpen: boolean;
  onClose: () => void;
}

function calculateReadingTime(content: string | null | undefined): number {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4 text-gradient">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 text-gradient">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-muted-foreground leading-relaxed mb-4">')
    .replace(/\n/g, '<br />');
}

export function NewsletterModal({ newsletter, isOpen, onClose }: NewsletterModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!newsletter) return null;

  const readingTime = calculateReadingTime(newsletter.content);

  const handleCopy = () => {
    if (newsletter.content) {
      navigator.clipboard.writeText(newsletter.content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Newsletter content has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PulseAI - ${newsletter.tag} Weekly Digest`,
          text: newsletter.content?.slice(0, 200) || "",
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 bg-card border border-border/50 rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/50">
              <div className="flex items-center gap-4">
                <TagBadge tag={newsletter.tag} size="md" />
                <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(newsletter.window_end), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime} min read</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
              <div className="max-w-3xl mx-auto">
                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
                >
                  <span className="text-gradient">{newsletter.tag}</span> Weekly Digest
                </motion.h1>

                {/* Time Window */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-muted-foreground mb-8"
                >
                  Coverage: {format(new Date(newsletter.window_start), "MMM d")} -{" "}
                  {format(new Date(newsletter.window_end), "MMM d, yyyy")}
                </motion.p>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="prose prose-invert prose-lg max-w-none"
                >
                  {newsletter.content ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: `<p class="text-muted-foreground leading-relaxed mb-4">${renderMarkdown(newsletter.content)}</p>`,
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic">No content available for this newsletter.</p>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-border/50 bg-muted/30">
              <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Published on {format(new Date(newsletter.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
                <Button variant="hero" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Share Newsletter
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
