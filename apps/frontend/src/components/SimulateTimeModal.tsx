import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { SimulationStateDto } from '@repo-manager/shared';
import { X, FastForward, RotateCcw, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SimulateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulateTimeModal: React.FC<SimulateTimeModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: simulationState, refetch, isFetching } = useQuery<SimulationStateDto>({
    queryKey: ['simulationState'],
    queryFn: async () => {
      const res: any = await apiClient.get('/scheduler/simulation');
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const advanceMutation = useMutation({
    mutationFn: async (days: number) => {
      const res: any = await apiClient.post('/scheduler/simulation/advance', { days });
      return res.data;
    },
    onSuccess: (data: any) => {
      const details = data?.data?.retentionResult?.details?.join(', ');
      const message = details
        ? `Advanced ${data?.message}. Actions: ${details}`
        : data?.message || 'Simulated time advanced';
      setFeedback({ type: 'success', message });
      queryClient.invalidateQueries({ queryKey: ['simulationState'] });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to advance time' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res: any = await apiClient.post('/scheduler/simulation/reset');
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Simulation time reset to real current time' });
      queryClient.invalidateQueries({ queryKey: ['simulationState'] });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset simulation' });
    },
  });

  if (!isOpen) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPending = advanceMutation.isPending || resetMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
              <FastForward className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                Simulate Time
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                  Demo Tool
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Advance application effective date to test repository retention & expiry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Active Simulation Status Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Real System Date
              </span>
              <span className="text-xs font-mono font-medium text-slate-700">
                {formatDate(simulationState?.realDate)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Current Simulated Date
              </span>
              <span className="text-sm font-mono font-bold text-amber-700">
                {formatDate(simulationState?.effectiveDate)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">Simulation Offset:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  (simulationState?.offsetDays || 0) > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {(simulationState?.offsetDays || 0) > 0
                  ? `+${simulationState?.offsetDays} Day(s) Ahead`
                  : '0 Days (Real Time)'}
              </span>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="underline shrink-0">
                Dismiss
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">Advance Effective Time By:</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 5, 10, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => advanceMutation.mutate(days)}
                  disabled={isPending}
                  className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 flex flex-col items-center"
                >
                  <span>+{days}</span>
                  <span className="text-[10px] font-normal text-amber-700">{days === 1 ? 'Day' : 'Days'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Advancing time evaluates repository retention rules against simulated effective date. Repositories crossing
              retention expiry will be automatically archived or deleted per policy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => resetMutation.mutate()}
            disabled={isPending || (simulationState?.offsetDays || 0) === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
