'use client';
import { useEffect, useState } from 'react';
import { timeLeft } from '@/lib/format';
import { ClockIcon } from './Icons';

export default function Countdown({ closesAt, icon = true }: { closesAt: string; icon?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="time" suppressHydrationWarning>
      {icon && <ClockIcon />}
      {now === null ? timeLeft(closesAt) : timeLeft(closesAt, now)}
    </span>
  );
}
