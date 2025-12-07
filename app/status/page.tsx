import { Suspense } from 'react';
import { LineStatus } from '@/components/status/line-status';

interface StatusPageProps {
  searchParams?: Promise<{
    mode?: string | string[];
  }>;
}

export default async function StatusPage({ searchParams }: StatusPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const modeParam = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;

  return (
    <div className="container py-8 md:py-12">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading status…</div>}>
        <LineStatus defaultMode={modeParam ?? null} />
      </Suspense>
    </div>
  );
}
