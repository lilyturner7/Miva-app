'use client';

import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Oggi', icon: '⌂' },
  { href: '/calendar', label: 'Calendario', icon: '▦' },
  { href: '/recipes', label: 'Ricette', icon: '♡' },
  { href: '/pantry', label: 'Dispensa', icon: '⌑' },
  { href: '/shopping', label: 'Spesa', icon: '✓' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomNavV1" aria-label="Navigazione principale">
      <div className="bottomNavRow">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return <a key={item.href} href={item.href} className={`bottomNavItem ${active ? 'active' : ''}`}>
            <span className="bottomNavIcon">{item.icon}</span>
            <span>{item.label}</span>
          </a>;
        })}
      </div>
      <a href="/camera" className={`cameraDockButton ${pathname.startsWith('/camera') ? 'active' : ''}`} aria-label="Apri Camera">
        <span aria-hidden="true">⌾</span>
      </a>
    </nav>
  );
}
