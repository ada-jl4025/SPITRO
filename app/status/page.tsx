import { LineStatus } from '@/components/status/line-status';

interface StatusPageProps {
  searchParams?: {
    mode?: string | string[];
  };
}

export default function StatusPage({ searchParams }: StatusPageProps) {
  const modeParam = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] : searchParams?.mode;

  return (
    <div className="container py-8 md:py-12">
      <LineStatus defaultMode={modeParam ?? null} />
    </div>
  );
}
