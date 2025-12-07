import { getTagColor } from "@/lib/tagColors";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: string;
  size?: "sm" | "md";
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function TagBadge({ tag, size = "sm", interactive = false, selected = false, onClick }: TagBadgeProps) {
  const colors = getTagColor(tag);

  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all duration-200",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        interactive && "cursor-pointer hover:scale-105",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {tag}
    </button>
  );
}
