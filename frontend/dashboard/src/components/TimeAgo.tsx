'use client';
import { useEffect, useState } from 'react';

/** Relative time that updates on the client; renders the absolute UTC time until hydrated. */
export default function TimeAgo({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
      setText(s < 90 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 * 2 ? `${Math.round(s / 3600)} hours ago` : `${Math.round(s / 86400)} days ago`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return <span title={iso}>{text ?? new Date(iso).toUTCString().replace(' GMT', ' UTC')}</span>;
}
