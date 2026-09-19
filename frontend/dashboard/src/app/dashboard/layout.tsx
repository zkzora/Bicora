import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import DashboardTour from '@/components/DashboardTour';
import { getSnapshot } from '@/lib/data';

export const metadata: Metadata = { title: { default: 'Risk Dashboard', template: '%s · Bicora Risk Dashboard' } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { snapshot, source } = await getSnapshot();
  return (
    <AppShell
      generatedAt={snapshot.generatedAt}
      methodologyVersion={snapshot.methodologyVersion}
      source={source}
      protocols={snapshot.protocols.map((p) => ({ slug: p.slug, name: p.name }))}
    >
      {children}
      <DashboardTour />
    </AppShell>
  );
}
