import { JourneyPlanner } from '@/components/journey/journey-planner'

export default function JourneyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="container py-10 md:py-16 flex-1">
        <JourneyPlanner />
      </section>
    </div>
  )
}

