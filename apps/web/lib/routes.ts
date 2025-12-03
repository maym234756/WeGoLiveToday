export type NavItem = { href: string; label: string };

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/go-live', label: 'Go Live' },
  { href: '/pricing', label: 'Pricing' },
];

export const AUTH_NAV: NavItem[] = [
  { href: '/login', label: 'Sign in' },
  { href: '/signup', label: 'Create account' },
];
