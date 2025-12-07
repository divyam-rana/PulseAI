import { motion } from "framer-motion";
import { FileText, Tag, Calendar, TrendingUp } from "lucide-react";
import { Newsletter } from "@/types/newsletter";
import { useMemo } from "react";

interface StatsBarProps {
  newsletters: Newsletter[];
  filteredCount: number;
}

export function StatsBar({ newsletters, filteredCount }: StatsBarProps) {
  const stats = useMemo(() => {
    const uniqueTags = new Set(newsletters.map((n) => n.tag)).size;
    const latestDate = newsletters.length
      ? new Date(Math.max(...newsletters.map((n) => new Date(n.window_end).getTime())))
      : null;

    return {
      total: newsletters.length,
      uniqueTags,
      latestDate,
      filtered: filteredCount,
    };
  }, [newsletters, filteredCount]);

  const statItems = [
    {
      icon: FileText,
      value: stats.filtered,
      label: "Newsletters",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      icon: Tag,
      value: stats.uniqueTags,
      label: "Categories",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: TrendingUp,
      value: `${Math.round((stats.filtered / stats.total) * 100)}%`,
      label: "Showing",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-4 md:gap-6"
    >
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <div className={`p-1.5 rounded-lg ${stat.bg}`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <div>
            <span className="font-semibold text-foreground">{stat.value}</span>
            <span className="text-sm text-muted-foreground ml-1">{stat.label}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
