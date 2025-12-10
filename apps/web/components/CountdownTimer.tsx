'use client';
import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string;
}

export default function CountdownTimer({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const countdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft('🚀 We’ve launched!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    countdown();
    const timer = setInterval(countdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="text-2xl font-bold text-emerald-400">
      {timeLeft}
    </div>
  );
}
