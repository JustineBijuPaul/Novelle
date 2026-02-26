import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(level?: string) {
  switch (level) {
    case 'LOW': return 'text-green-600 bg-green-50';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
    case 'HIGH': return 'text-red-600 bg-red-50';
    default: return 'text-gray-500 bg-gray-50';
  }
}

export function getRiskBadge(level?: string) {
  switch (level) {
    case 'LOW': return 'risk-badge-low';
    case 'MEDIUM': return 'risk-badge-medium';
    case 'HIGH': return 'risk-badge-high';
    default: return 'risk-badge-low';
  }
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getWeekDescription(week: number): string {
  if (week <= 12) return `Week ${week} — First Trimester`;
  if (week <= 27) return `Week ${week} — Second Trimester`;
  if (week <= 42) return `Week ${week} — Third Trimester`;
  return 'Postpartum';
}

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😢', 2: '😟', 3: '😐', 4: '🙂', 5: '😊', 6: '😄', 7: '🤩', 8: '😌', 9: '💪', 10: '🌟',
};

export const EMOTION_OPTIONS = [
  'Joy', 'Anxious', 'Hopeful', 'Tired', 'Grateful', 'Scared', 'Calm',
  'Excited', 'Sad', 'Overwhelmed', 'Loved', 'Frustrated', 'Peaceful', 'Worried',
];
