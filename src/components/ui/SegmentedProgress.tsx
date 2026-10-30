import React from 'react';
import { PROCESS_STAGES } from '@/lib/constants';

export interface SegmentedProgressProps {
  currentStageId: string;
  totalStages?: number;
  showLabels?: boolean;
  className?: string;
}

export const SegmentedProgress: React.FC<SegmentedProgressProps> = ({
  currentStageId,
  showLabels = false,
  className = '',
}) => {
  const currentStageIndex = PROCESS_STAGES.findIndex((s) => s.id === currentStageId);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
  const currentStageObj = PROCESS_STAGES[activeIndex] || PROCESS_STAGES[0];
  const progressPct = Math.round(((activeIndex + 1) / PROCESS_STAGES.length) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Step {currentStageObj.stepNumber} of 8: {currentStageObj.shortName}
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {progressPct}% Completed
          </span>
        </div>
      )}

      {/* 8 Segments */}
      <div className="grid grid-cols-8 gap-1 h-1.5 w-full">
        {PROCESS_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={stage.id}
              title={`Step ${stage.stepNumber}: ${stage.shortName} - ${stage.description}`}
              className={`rounded-full transition-all duration-200 ${
                isCompleted
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : isCurrent
                  ? 'bg-blue-600 dark:bg-blue-400 shadow-xs ring-1 ring-blue-500/40'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

