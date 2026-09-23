import React from 'react';
import { RequestStatus, RequestHistoryItem } from '../../types';
import { Check, Clock, AlertCircle, ArrowDown } from 'lucide-react';
import { WorkflowTrackSvg } from '../ui/AnimatedSvg';

interface RequestTimelineProps {
  currentStatus: RequestStatus;
  history?: RequestHistoryItem[];
}

const LIFECYCLE_STEPS: { status: RequestStatus; label: string; description: string }[] = [
  { status: 'CREATED', label: 'Created', description: 'Request logged by customer' },
  { status: 'ASSIGNED', label: 'Assigned', description: 'Agent assigned to request' },
  { status: 'ACCEPTED', label: 'Accepted', description: 'Agent accepted assignment' },
  { status: 'IN_PROGRESS', label: 'In Progress', description: 'Service work underway' },
  { status: 'COMPLETED', label: 'Completed', description: 'Service fulfilled successfully' },
];

export const RequestTimeline: React.FC<RequestTimelineProps> = ({
  currentStatus,
  history = [],
}) => {
  const isCancelled = currentStatus === 'CANCELLED';

  const getStepIndex = (status: RequestStatus) => {
    return LIFECYCLE_STEPS.findIndex((s) => s.status === status);
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Status Lifecycle</h3>
          <p className="text-xs text-neutral-500">Chronological service fulfillment stage</p>
        </div>
        {isCancelled && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Request Cancelled
          </span>
        )}
      </div>

      {/* Animated SVG Workflow Pipeline */}
      <div className="mb-6 p-3 bg-neutral-50/70 rounded-xl border border-neutral-100">
        <WorkflowTrackSvg status={currentStatus} />
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isPassed = !isCancelled && currentIndex > idx;
          const isCurrent = !isCancelled && currentIndex === idx;
          const isPending = isCancelled || currentIndex < idx;

          // Find history entry for this transition
          const matchedHistory = history.find((h) => h.new_status === step.status);

          let circleClass = 'bg-neutral-100 text-neutral-400 border-neutral-300';
          let icon = <Clock className="w-3 h-3" />;

          if (isPassed) {
            circleClass = 'bg-emerald-600 text-white border-emerald-600';
            icon = <Check className="w-3 h-3 stroke-[3]" />;
          } else if (isCurrent) {
            circleClass = 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-50';
            icon = <ArrowDown className="w-3 h-3 stroke-[3] animate-bounce" />;
          }

          return (
            <div key={step.status} className="relative flex items-start gap-4">
              {/* Circle on timeline */}
              <div
                className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 transition-all ${circleClass}`}
              >
                {icon}
              </div>

              {/* Step info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isCurrent
                        ? 'text-indigo-600'
                        : isPassed
                        ? 'text-neutral-900'
                        : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Current Stage
                    </span>
                  )}
                  {matchedHistory?.created_at && (
                    <span className="text-[11px] text-neutral-400 ml-auto">
                      {new Date(matchedHistory.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>

                {matchedHistory?.note && (
                  <div className="mt-1.5 p-2 rounded-lg bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-700">Note: </span>
                    {matchedHistory.note}
                    {matchedHistory.changed_by_name && (
                      <span className="text-neutral-400 text-[11px] block mt-0.5">
                        By {matchedHistory.changed_by_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isCancelled && (
          <div className="relative flex items-start gap-4 pt-2">
            <div className="absolute -left-6 mt-0.5 w-6 h-6 rounded-full bg-rose-600 text-white border-rose-600 flex items-center justify-center text-xs shrink-0 ring-4 ring-rose-50">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
                Cancelled
              </span>
              <p className="text-xs text-rose-500">This service request was terminated.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestTimeline;
