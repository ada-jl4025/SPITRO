"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/journey', label: 'Journey planner' },
  { href: '/next-available', label: 'Next available' },
  { href: '/status', label: 'Service status' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:px-5 md:text-base",
              isActive
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-blue-600" aria-hidden="true" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

