import { useLocation } from 'react-router-dom';
import { ClassicFrame } from '@/components/ClassicFrame';
import { PageHeader } from '@/components/ui';

export const CLASSIC_PAGES: { label: string; path: string; description: string }[] = [
  { label: 'Home', path: '/', description: 'The classic iLINQ dashboard' },
  { label: 'Messages', path: '/messages', description: 'Internal mail' },
  { label: 'Notifications', path: '/notifications', description: 'Everything you have been notified about' },
  { label: 'Calendar', path: '/calendar', description: 'Classic calendar with event details and RSVP' },
  { label: 'Due work', path: '/learning/due', description: 'Submit work and see feedback' },
  { label: 'ePortfolio', path: '/eportfolio', description: 'Your portfolio pages' },
  { label: 'Reports', path: '/reports', description: 'Academic reports' },
  { label: 'Files', path: '/files', description: 'My files' },
  { label: 'Search', path: '/search', description: 'Classic search' },
  { label: 'My profile', path: '/profile', description: 'Profile, tokens and settings' },
];

/** Embeds any classic iLINQ path: /classic/<path>. */
export default function ClassicPage() {
  const loc = useLocation();
  const path = loc.pathname.replace(/^\/classic/, '') || '/';
  const known = CLASSIC_PAGES.find((p) => p.path === path);
  return (
    <div>
      <PageHeader title={known?.label ?? 'Classic iLINQ'} subtitle={known?.description ?? 'Embedded from ilinq.sheldoncollege.com'} />
      <ClassicFrame path={path + loc.search} title={known?.label ?? 'Classic iLINQ'} />
    </div>
  );
}
