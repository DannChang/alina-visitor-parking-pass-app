'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PatrolFABProps {
  className?: string;
}

/**
 * Floating Action Button for quick access to patrol/scan mode
 * Displays on dashboard pages for authorized users
 */
export function PatrolFAB({ className }: PatrolFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Expanded state with tooltip */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <p className="font-medium">Scan License Plate</p>
            <p className="text-xs text-slate-300">Quick patrol mode access</p>
          </div>
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      )}

      {/* FAB Button */}
      <Button
        asChild
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-200',
          'bg-blue-600 hover:bg-blue-700 hover:scale-105',
          'focus:ring-4 focus:ring-blue-300',
          isExpanded && 'ring-4 ring-blue-300'
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
      >
        <Link href="/" aria-label="Open patrol scanner">
          <Camera className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * Dismissible FAB with close button
 * For users who want to hide it temporarily
 */
export function DismissiblePatrolFAB({ className }: PatrolFABProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Close button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute -top-2 -right-2 p-1 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"
        aria-label="Hide scan button"
      >
        <X className="h-3 w-3 text-slate-600" />
      </button>

      {/* Expanded state with tooltip */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <p className="font-medium">Scan License Plate</p>
            <p className="text-xs text-slate-300">Quick patrol mode access</p>
          </div>
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      )}

      {/* FAB Button */}
      <Button
        asChild
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-200',
          'bg-blue-600 hover:bg-blue-700 hover:scale-105',
          'focus:ring-4 focus:ring-blue-300',
          isExpanded && 'ring-4 ring-blue-300'
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
      >
        <Link href="/" aria-label="Open patrol scanner">
          <Camera className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
