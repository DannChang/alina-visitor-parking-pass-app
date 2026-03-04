'use client';

import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EscalationTimelineProps {
  currentLevel: 'NONE' | 'WARNING' | 'FORMAL_LETTER' | 'TOW_NOTICE';
  warningIssuedAt: string | null;
  formalLetterIssuedAt: string | null;
  towNoticeIssuedAt: string | null;
}

interface TimelineStage {
  label: string;
  isCompleted: boolean;
  date: string | null;
  isTowNotice: boolean;
}

export function EscalationTimeline({
  currentLevel: _currentLevel,
  warningIssuedAt,
  formalLetterIssuedAt,
  towNoticeIssuedAt,
}: EscalationTimelineProps) {
  const stages: TimelineStage[] = [
    {
      label: 'Created',
      isCompleted: true,
      date: null,
      isTowNotice: false,
    },
    {
      label: 'Warning',
      isCompleted: warningIssuedAt !== null,
      date: warningIssuedAt,
      isTowNotice: false,
    },
    {
      label: 'Formal Letter',
      isCompleted: formalLetterIssuedAt !== null,
      date: formalLetterIssuedAt,
      isTowNotice: false,
    },
    {
      label: 'Tow Notice',
      isCompleted: towNoticeIssuedAt !== null,
      date: towNoticeIssuedAt,
      isTowNotice: true,
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.label} className="flex items-start gap-3">
            {/* Icon and connecting line */}
            <div className="flex flex-col items-center">
              {stage.isCompleted ? (
                stage.isTowNotice ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                )
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300" />
              )}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-8',
                    stage.isCompleted ? (stage.isTowNotice ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Label and date */}
            <div className="pb-8 last:pb-0">
              <p
                className={cn(
                  'text-sm font-medium leading-5',
                  stage.isCompleted
                    ? stage.isTowNotice
                      ? 'text-red-600'
                      : 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </p>
              {stage.date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(stage.date), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
