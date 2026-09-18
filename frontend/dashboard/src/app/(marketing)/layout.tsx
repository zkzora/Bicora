import { SiteNav } from '@/components/SiteChrome';
import SiteFooter from '@/components/SiteFooter';
import { getSnapshot } from '@/lib/data';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { snapshot } = await getSnapshot();
  return (
    <>
      <SiteNav />
      <div className="page">{children}</div>
      <SiteFooter version={snapshot.methodologyVersion} protocols={snapshot.protocols.map((p) => ({ slug: p.slug, name: p.name }))} />
    </>
  );
}
