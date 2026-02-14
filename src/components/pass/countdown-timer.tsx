'use client';

import { useCountdown } from '@/hooks/use-countdown';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: Date | string;
  className?: string;
  showLabel?: boolean;
}

export function CountdownTimer({
  endTime,
  className,
  showLabel = true,
}: CountdownTimerProps) {
  const { hours, minutes, seconds, isExpired, isExpiringSoon } =
    useCountdown(endTime);

  const colorClass = isExpired
    ? 'text-red-600'
    : isExpiringSoon
      ? 'text-yellow-600'
      : 'text-green-600';

  const bgClass = isExpired
    ? 'bg-red-50 border-red-200'
    : isExpiringSoon
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-green-50 border-green-200';

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className={cn(
        'rounded-lg border p-4 text-center',
        bgClass,
        className
      )}
    >
      {showLabel && (
        <p className={cn('text-sm font-medium mb-1', colorClass)}>
          {isExpired ? 'Pass Expired' : 'Time Remaining'}
        </p>
      )}
      <div className={cn('font-mono text-3xl font-bold tabular-nums', colorClass)}>
        {isExpired ? (
          '00:00:00'
        ) : (
          `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        )}
      </div>
      {!isExpired && isExpiringSoon && (
        <p className="text-xs text-yellow-700 mt-1">
          Your pass is expiring soon
        </p>
      )}
    </div>
  );
}
