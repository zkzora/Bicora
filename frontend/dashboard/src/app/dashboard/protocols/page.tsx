import { redirect } from 'next/navigation';
import { getSnapshot } from '@/lib/data';
import { dash } from '@/lib/urls';

export default async function ProtocolsIndex() {
  const { snapshot } = await getSnapshot();
  redirect(dash(`/protocols/${snapshot.protocols[0]?.slug ?? ''}`));
}
