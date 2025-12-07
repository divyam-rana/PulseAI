import { TagColor } from "@/types/newsletter";

const tagColorMap: Record<string, TagColor> = {
  'AI': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  'Machine Learning': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
  },
  'Deep Learning': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  'NLP': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  'Computer Vision': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  'Robotics': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  'Ethics': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  'Research': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
  'Industry': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  'Startup': {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
  },
};

const defaultColors: TagColor[] = [
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
];

// Simple background color mapping for badges
export const TAG_COLORS: Record<string, string> = {
  'AI/ML': 'bg-cyan-500',
  'LLMs': 'bg-violet-500',
  'Deep Learning': 'bg-purple-500',
  'NLP': 'bg-emerald-500',
  'Computer Vision': 'bg-amber-500',
  'Robotics': 'bg-rose-500',
  'Ethics': 'bg-blue-500',
  'Research': 'bg-indigo-500',
  'Industry': 'bg-orange-500',
  'Startup': 'bg-pink-500',
  'Quantum Computing': 'bg-teal-500',
  'Healthcare': 'bg-green-500',
  'Tech News': 'bg-sky-500',
  'Discussion': 'bg-slate-500',
  'Python': 'bg-yellow-500',
  'Projects': 'bg-red-500',
};

export function getTagColor(tag: string): TagColor {
  if (tagColorMap[tag]) {
    return tagColorMap[tag];
  }
  
  // Generate consistent color based on tag string
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaultColors[hash % defaultColors.length];
}
