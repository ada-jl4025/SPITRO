import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Github, Mic, Route, ShieldCheck, Sparkles, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tfl-blue/15 via-transparent to-tfl-green/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(17,59,146,0.15),transparent_60%)]" />
        <div className="container relative py-16 md:py-24 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-tfl-blue shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Open-source & community driven
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Meet Spitro — the natural language journey planner for London
              </h1>
              <p className="text-lg text-foreground/80 sm:text-xl md:text-2xl md:leading-relaxed">
                Ask in everyday language, receive detailed routes, accessibility notes, and live status powered by Transport for London data. Built in the open for travellers of every age and ability.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg font-semibold">
                  <Link href="/journey">
                    Plan a journey
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 rounded-full px-8 text-lg font-semibold">
                  <Link href="https://github.com/ada-jl4025/SPITRO-London-Public-Transport-Planner-with-Natural-Language-Input" target="_blank" rel="noopener noreferrer">
                    View the code
                    <Github className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="glass border border-white/40 shadow-[var(--shadow-soft)]">
              <CardContent className="space-y-6 p-8">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    How Spitro helps
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Speak naturally and Spitro will:
                  </p>
                </div>
                <ul className="space-y-4 text-left text-base">
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tfl-blue/10 text-tfl-blue">
                      <Mic className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Understand natural language requests</p>
                      <p className="text-muted-foreground">"Take me from Victoria to King’s Cross" or "I need a step-free route" — Spitro listens.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tfl-blue/10 text-tfl-blue">
                      <Route className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Plot reliable journeys</p>
                      <p className="text-muted-foreground">Combining Tube, bus, and walking directions with step-by-step instructions.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tfl-blue/10 text-tfl-blue">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Champion accessibility</p>
                      <p className="text-muted-foreground">Bigger text options, high contrast mode, and accessible journey summaries keep everyone informed.</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Start Tiles */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">Start exploring</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose how you want to navigate London's transport network
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link href="/journey" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tfl-blue focus-visible:ring-offset-2 rounded-2xl">
              <Card className="h-full border-2 border-transparent bg-gradient-to-br from-white to-tfl-blue/5 shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-tfl-blue/30 group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-tfl-blue/10">
                <CardContent className="p-8">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-tfl-blue/20 to-tfl-blue/10 text-tfl-blue shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <Route className="h-8 w-8" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-tfl-blue group-hover:translate-x-1 transition-all duration-300" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-tfl-blue transition-colors">Journey planner</h3>
                      <p className="text-base text-muted-foreground leading-relaxed">Type or speak your trip and get detailed, accessible routes.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/next-available" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tfl-green focus-visible:ring-offset-2 rounded-2xl">
              <Card className="h-full border-2 border-transparent bg-gradient-to-br from-white to-tfl-green/5 shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-tfl-green/30 group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-tfl-green/10">
                <CardContent className="p-8">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-tfl-green/20 to-tfl-green/10 text-tfl-green shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <Clock className="h-8 w-8" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-tfl-green group-hover:translate-x-1 transition-all duration-300" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-tfl-green transition-colors">Next available</h3>
                      <p className="text-base text-muted-foreground leading-relaxed">See nearby stations and live departures with walking links.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/status" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-2xl">
              <Card className="h-full border-2 border-transparent bg-gradient-to-br from-white to-amber-50 shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-amber-300 group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-amber-100">
                <CardContent className="p-8">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/40 to-amber-100/30 text-amber-700 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <ShieldCheck className="h-8 w-8" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-amber-700 transition-colors">Service status</h3>
                      <p className="text-base text-muted-foreground leading-relaxed">Live line conditions and upcoming services across modes.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why travellers choose Spitro</h2>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            Created for Londoners, tourists, carers, and power users alike — with transparent code you can trust.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[{
            title: 'Natural language first',
            description: 'Type or speak plain English requests. Spitro parses intents and fills complicated forms on your behalf.'
          }, {
            title: 'Real-time TfL data',
            description: 'Service status and live arrival updates keep your journey on track during busy travel times.'
          }, {
            title: 'Community owned',
            description: 'Licensed for everyone. Suggest improvements, file issues, or host your own copy — it’s all on GitHub.'
          }, {
            title: 'Built for accessibility',
            description: 'Plain-language instructions, generous contrast, and screen-reader friendly summaries keep every traveller confident.'
          }, {
            title: 'Step-free insights',
            description: 'See lifts, ramps, and walking distances before you set off with enhanced accessible journey notes.'
          }, {
            title: 'Privacy conscious',
            description: 'No tracking pixels or advertising. Your requests stay between you, Spitro, and the TfL APIs.'
          }].map((item) => (
            <Card key={item.title} className="border border-border/50 bg-white/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-tfl-blue to-tfl-green p-12 text-center text-white shadow-[var(--shadow-soft)]">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to try Spitro?</h2>
          <p className="text-lg text-white/85 md:text-xl">
            Jump into the journey planner to experience natural language routing and accessibility-first design.
          </p>
          <Button asChild size="lg" className="h-14 rounded-full bg-white text-tfl-blue hover:bg-white/90">
            <Link href="/journey">
              Launch the journey planner
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
