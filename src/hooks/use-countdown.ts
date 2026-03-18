'use client';

import { useState, useCallback, useRef } from 'react';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';

interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // < 30 minutes remaining
}

export function useCountdown(endTime: Date | string): CountdownResult {
  const endTimeRef = useRef(
    typeof endTime === 'string' ? new Date(endTime) : endTime
  );

  const calculate = useCallback((): CountdownResult => {
    const now = new Date();
    const diff = endTimeRef.current.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        isExpiringSoon: false,
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const isExpiringSoon = totalSeconds <= 30 * 60; // 30 minutes

    return { hours, minutes, seconds, totalSeconds, isExpired: false, isExpiringSoon };
  }, []);

  const [countdown, setCountdown] = useState<CountdownResult>(calculate);

  // Update endTimeRef and recalculate when endTime prop changes
  useFetchOnChange(() => {
    endTimeRef.current =
      typeof endTime === 'string' ? new Date(endTime) : endTime;
    setCountdown(calculate());
  }, [endTime, calculate]);

  // Tick every second while not expired
  useMountEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.isExpired) return prev;
        return calculate();
      });
    }, 1000);

    return () => clearInterval(interval);
  });

  return countdown;
}
