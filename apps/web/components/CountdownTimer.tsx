'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string;
  startCountdownOn?: string; // optional delayed start
}

export default function CountdownTimer({
  targetDate,
  startCountdownOn,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    const countdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const startTime = startCountdownOn
        ? new Date(startCountdownOn).getTime()
        : null;

      // ⛔ Countdown has not started yet
      if (startTime && now < startTime) {
        setActive(false);
        setTimeLeft('⏳ Countdown begins December 31, 2024');
        return;
      }

      setActive(true);

      const difference = target - now;

      // 🚀 Countdown finished
      if (difference <= 0) {
        setTimeLeft('🚀 We’ve launched!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    countdown();
    const timer = setInterval(countdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate, startCountdownOn]);

  return (
    <div
      className={`text-2xl font-bold ${
        active ? 'text-emerald-400' : 'text-zinc-500'
      }`}
    >
      {timeLeft}
    </div>
  );
}
