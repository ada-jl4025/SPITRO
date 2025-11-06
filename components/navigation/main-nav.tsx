"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, Menu, X } from 'lucide-react';
import {
  ALL_MODE_OPTION,
  MODE_KEYS,
  getModeLabel,
  modeConfig,
  normalizeModeSelection,
  type ModeSelectionValue,
} from '@/lib/mode-config';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/journey', label: 'Journey planner' },
  { href: '/next-available', label: 'Next available' },
];

export function MainNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [mobileStatusOpen, setMobileStatusOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  const statusOptions = useMemo(
    () => [
      {
        value: ALL_MODE_OPTION.value,
        label: ALL_MODE_OPTION.label,
        href: '/status',
        icon: ALL_MODE_OPTION.icon,
      },
      ...MODE_KEYS.map((mode) => ({
        value: mode as ModeSelectionValue,
        label: modeConfig[mode].label,
        href: `/status?mode=${encodeURIComponent(mode)}`,
        icon: modeConfig[mode].icon,
      })),
    ],
    []
  );

  const currentModeSelection = normalizeModeSelection(searchParams?.get('mode'));
  const currentStatusLabel = getModeLabel(currentModeSelection);
  const isStatusActive = pathname.startsWith('/status');

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setStatusMenuOpen(false);
    setMobileStatusOpen(false);
  }, [pathname]);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }

      if (statusMenuOpen) {
        setStatusMenuOpen(false);
      }

      if (mobileStatusOpen) {
        setMobileStatusOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen, statusMenuOpen, mobileStatusOpen]);

  // Close desktop status menu on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!statusMenuRef.current) return;
      if (statusMenuRef.current.contains(event.target as Node)) return;
      setStatusMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileStatusOpen(false);
    }
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:px-5 md:text-base",
                active
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-blue-600" aria-hidden="true" />
              )}
            </Link>
          );
        })}

        <div className="relative" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setStatusMenuOpen((prev) => !prev)}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:px-5 md:text-base",
              isStatusActive || statusMenuOpen
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
            aria-haspopup="true"
            aria-expanded={statusMenuOpen}
          >
            <div className="flex flex-col items-start leading-tight">
              <span>Service status</span>
              <span className="text-xs font-normal text-gray-500">{currentStatusLabel}</span>
            </div>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", statusMenuOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {statusMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              <div role="menu" aria-label="Service status modes" className="flex flex-col gap-1">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const optionActive = isStatusActive && currentModeSelection === option.value;
                  const optionColor =
                    option.value === ALL_MODE_OPTION.value
                      ? '#1D70B8'
                      : modeConfig[
                          option.value as Exclude<ModeSelectionValue, typeof ALL_MODE_OPTION.value>
                        ]?.color ?? '#1D70B8';

                  return (
                    <Link
                      key={option.value}
                      href={option.href}
                      onClick={() => {
                        setStatusMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                        optionActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      )}
                      role="menuitem"
                    >
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50"
                        style={{ color: optionColor }}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-left">{option.label}</span>
                      {optionActive && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Current</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Menu Panel */}
          <nav
            className="fixed top-[64px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="container py-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block rounded-lg px-4 py-3 text-base font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                      active
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-3 px-2">
                <button
                  type="button"
                  onClick={() => setMobileStatusOpen((prev) => !prev)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    isStatusActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  aria-expanded={mobileStatusOpen}
                >
                  <span>Service status</span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", mobileStatusOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>

                {mobileStatusOpen && (
                  <div className="mt-2 space-y-1 pl-4">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      const optionActive = isStatusActive && currentModeSelection === option.value;

                      return (
                        <Link
                          key={option.value}
                          href={option.href}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setMobileStatusOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                            optionActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                          )}
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="flex-1 text-left">{option.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

