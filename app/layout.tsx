import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { MainNav } from '@/components/navigation/main-nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spitro – Open Source London Journey Planner',
  description:
    'Spitro is the open-source natural language journey planner for London. Explore routes, accessibility guidance, and live transport status from Transport for London.',
  keywords: 'Spitro, London transport, journey planner, open source, TfL data, accessibility',
  openGraph: {
    title: 'Spitro',
    description: 'Open-source natural language journey planning for London.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="relative min-h-full flex flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-1/2 focus:top-6 focus:-translate-x-1/2 focus:rounded-2xl focus:bg-blue-600 focus:px-6 focus:py-3 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Skip to main content
          </a>
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
            <div className="container">
              <div className="flex items-center justify-between py-4 md:py-7">
                {/* Brand */}
                <Link
                  href="/"
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:rounded-xl"
                  aria-label="Spitro home"
                >
                  <span className="text-xl font-semibold tracking-tight text-gray-900 transition-colors duration-200 group-hover:text-blue-600 md:text-3xl">
                    Spitro
                  </span>
                </Link>

                {/* Navigation */}
                <Suspense
                  fallback={
                    <div className="h-10 w-24" aria-hidden="true" />
                  }
                >
                  <MainNav />
                </Suspense>
              </div>
            </div>
          </header>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="bg-gray-50/50 border-t border-gray-200/50 py-8 md:py-12">
            <div className="container">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-500">
                  Data provided by Transport for London
                </p>
                <p className="text-xs text-gray-400">
                  © 2025 Spitro. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
