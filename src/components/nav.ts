import { BookOpen, CalendarDays, ClipboardList, Home, LayoutGrid, Newspaper, Sparkles, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/timetable', label: 'Timetable', icon: LayoutGrid },
  { to: '/due-work', label: 'Due work', icon: ClipboardList },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/feedback', label: 'Feedback', icon: Sparkles },
  { to: '/classes', label: 'Classes', icon: BookOpen },
];
