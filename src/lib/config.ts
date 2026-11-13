export const config = {
  appName: 'iLINQ 2.0',
  schoolName: 'Sheldon College',
  /** Browser-facing base path/origin for API calls (proxied in dev/prod). */
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) || '/sb',
  /** The real Schoolbox instance, used for outbound links. */
  schoolboxOrigin: (import.meta.env.VITE_SCHOOLBOX_ORIGIN as string | undefined) || 'https://ilinq.sheldoncollege.com',
  /** Force demo data (no network). */
  demoOnly: (import.meta.env.VITE_DEMO as string | undefined) === 'true',
  quickLinks: [
    { label: 'Classic iLINQ', href: 'https://ilinq.sheldoncollege.com', description: 'Open the original Schoolbox interface' },
    { label: 'College website', href: 'https://sheldoncollege.com', description: 'sheldoncollege.com' },
    { label: 'Key information', href: 'https://sheldoncollege.com/key-information', description: 'Uniform, bell times, policies' },
    { label: 'Mobile apps', href: 'https://sheldoncollege.com/key-information/mobile-apps', description: 'iLINQ and Sheldon College apps' },
    { label: 'Reset parent password', href: 'https://ilinq.sheldoncollege.com', description: 'Use the link on the iLINQ login page' },
  ],
};
