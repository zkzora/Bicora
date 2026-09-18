import { redirect } from 'next/navigation';
import { getSnapshot } from '@/lib/data';

export default async function ProtocolsIndex() {
  const { snapshot } = await getSnapshot();
  redirect(`/dashboard/protocols/${snapshot.protocols[0]?.slug ?? ''}`);
}
