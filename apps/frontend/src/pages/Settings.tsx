import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { SystemConfigDto, SimulationStateDto } from '@repo-manager/shared';
import { SimulateTimeModal } from '../components/SimulateTimeModal';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Save,
  Play,
  CheckCircle2,
  FastForward,
  RotateCcw,
  Clock,
  Calendar,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState<Partial<SystemConfigDto>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);

  const { data: config, isLoading } = useQuery<SystemConfigDto>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res: any = await apiClient.get('/settings');
      const data: SystemConfigDto = res.data;
      setFormData(data);
      return data;
    },
  });

  const { data: simulationState } = useQuery<SimulationStateDto>({
    queryKey: ['simulationState'],
    queryFn: async () => {
      const res: any = await apiClient.get('/scheduler/simulation');
      return res.data?.data || res.data;
    },
  });

  const resetSimulationMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/scheduler/simulation/reset');
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

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SystemConfigDto>) => {
      // Strip read-only/non-whitelisted fields before sending to backend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { simulationEnabled, ...payload } = data as any;
      return apiClient.post('/settings/update', payload);
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'System configuration updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings' });
    },
  });

  const triggerSchedulerMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/scheduler/trigger');
    },
    onSuccess: (res: any) => {
      const details = res.data?.data?.details?.join(', ') || 'Retention check completed';
      setFeedback({ type: 'success', message: `Scheduler execution finished: ${details}` });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-16 text-center text-xs text-[#6B6B6B]">Loading settings...</div>;
  }

  const isSimulationAllowed = Boolean(config?.simulationEnabled);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#1A1A1A] text-[#FDFBF7] rounded-xl shadow-md border border-[#C5A880]/40">
          <SettingsIcon className="w-6 h-6 text-[#C5A880]" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            System Configuration
          </h1>
          <p className="text-xs text-[#6B6B6B] font-medium">
            Repository governance retention rules, warning thresholds, and target org options
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border backdrop-blur-xl shadow-sm ${
            feedback.type === 'success'
              ? 'bg-[#FDFBF7] text-[#5E4432] border-[#C5A880]/50'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7D5E46] shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <Button variant="link" size="sm" onClick={() => setFeedback(null)} className="h-auto p-0 text-[#1A1A1A] underline">
            Dismiss
          </Button>
        </div>
      )}

      <Card className="border-[#E5E5E5] bg-white shadow-md overflow-hidden">
        <CardHeader className="border-b border-[#E5E5E5] bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#1A1A1A]">Repository Retention & Governance Policy</CardTitle>
              <CardDescription className="text-[#6B6B6B] text-xs">
                Define global default retention periods and lifecycle triggers.
              </CardDescription>
            </div>
            {!isAdmin && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F4EFEA] text-[#1A1A1A] rounded-full text-xs font-semibold border border-[#E5E5E5]">
                <Lock className="w-3.5 h-3.5 text-[#7D5E46]" />
                Read-Only (USER)
              </span>
            )}
          </div>
        </CardHeader>

        {!isAdmin && (
          <div className="m-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>
              System configuration changes require <strong>ADMIN</strong> privileges.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Repository Prefix</label>
                <Input
                  type="text"
                  value={formData.repoPrefix || ''}
                  onChange={(e) => setFormData({ ...formData, repoPrefix: e.target.value })}
                  placeholder="pt-"
                  disabled={!isAdmin}
                  className="bg-white border-[#E5E5E5] font-mono text-xs text-[#1A1A1A] disabled:bg-[#F4EFEA] disabled:text-[#6B6B6B]"
                  required
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1.5">
                  Only repositories starting with this prefix are governed by this system.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">GitHub Organization (Optional)</label>
                <Input
                  type="text"
                  value={formData.githubOrg || ''}
                  onChange={(e) => setFormData({ ...formData, githubOrg: e.target.value })}
                  placeholder="Leave empty for personal user repos"
                  disabled={!isAdmin}
                  className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] disabled:bg-[#F4EFEA] disabled:text-[#6B6B6B]"
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1.5">Leave empty to target personal GitHub user account.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Retention Days</label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.retentionDays || 90}
                  onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value, 10) })}
                  disabled={!isAdmin}
                  className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] disabled:bg-[#F4EFEA] disabled:text-[#6B6B6B]"
                  required
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1.5">Default days before repository expiry.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Warning Days Period</label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.warningDays || 7}
                  onChange={(e) => setFormData({ ...formData, warningDays: parseInt(e.target.value, 10) })}
                  disabled={!isAdmin}
                  className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] disabled:bg-[#F4EFEA] disabled:text-[#6B6B6B]"
                  required
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1.5">Days before expiry to trigger in-app warning alerts.</p>
              </div>

              <div className="sm:col-span-2 bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E5E5] space-y-2">
                <label className="block text-xs font-bold text-[#1A1A1A]">Default Expiry Action</label>
                <div className="flex gap-6 pt-1">
                  <label className={`flex items-center gap-2 text-xs font-medium ${!isAdmin ? 'cursor-not-allowed text-[#6B6B6B]' : 'cursor-pointer text-[#1A1A1A]'}`}>
                    <input
                      type="radio"
                      name="defaultExpiryAction"
                      value="delete"
                      checked={formData.defaultExpiryAction === 'delete'}
                      onChange={() => setFormData({ ...formData, defaultExpiryAction: 'delete' })}
                      disabled={!isAdmin}
                      className="text-[#1A1A1A] focus:ring-[#C5A880] bg-white border-[#E5E5E5]"
                    />
                    <span>Delete Permanently</span>
                  </label>
                  <label className={`flex items-center gap-2 text-xs font-medium ${!isAdmin ? 'cursor-not-allowed text-[#6B6B6B]' : 'cursor-pointer text-[#1A1A1A]'}`}>
                    <input
                      type="radio"
                      name="defaultExpiryAction"
                      value="archive"
                      checked={formData.defaultExpiryAction === 'archive'}
                      onChange={() => setFormData({ ...formData, defaultExpiryAction: 'archive' })}
                      disabled={!isAdmin}
                      className="text-[#1A1A1A] focus:ring-[#C5A880] bg-white border-[#E5E5E5]"
                    />
                    <span>Archive (Set Read-Only)</span>
                  </label>
                </div>
                <p className="text-[11px] text-[#6B6B6B] pt-1">
                  Action performed automatically by daily scheduler when a repository reaches expiry.
                </p>
              </div>
            </div>

            {/* Development / Testing Tools Panel */}
            {isSimulationAllowed && devToolsEnabled && (
              <div className="p-4 rounded-xl border border-[#C5A880]/50 bg-[#FDFBF7] space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#7D5E46] font-bold text-xs font-serif">
                    <FastForward className="w-4 h-4 text-[#C5A880]" />
                    <span>Development & Testing Simulation Controls</span>
                  </div>
                  {simulationState?.isSimulated && (
                    <span className="text-[10px] bg-[#E8DBCB] text-[#7D5E46] font-bold px-2 py-0.5 rounded-full uppercase border border-[#C5A880]/30">
                      +{simulationState.offsetDays}d Simulated
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#6B6B6B] font-medium">
                  {simulationState?.isSimulated
                    ? `Effective simulated date: ${new Date(simulationState.effectiveDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'Simulate time progression or trigger scheduler execution to test 90-day retention policies without waiting.'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => setIsSimulateModalOpen(true)}
                    className="gap-1.5 shadow-sm"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Simulate Time</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resetSimulationMutation.mutate()}
                    disabled={resetSimulationMutation.isPending || !simulationState?.isSimulated || simulationState?.offsetDays === 0}
                    className="gap-1.5 border-[#C5A880] text-[#7D5E46] hover:bg-[#F5EFE6] disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Time</span>
                  </Button>

                </div>
              </div>
            )}

            {/* Scheduler — Always Visible */}
            <div className="pt-4 border-t border-[#E5E5E5]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-700">Retention Scheduler</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Manually trigger the retention check to immediately apply the current policy across all managed repositories.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => triggerSchedulerMutation.mutate()}
                  disabled={triggerSchedulerMutation.isPending}
                  className="gap-1.5 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{triggerSchedulerMutation.isPending ? 'Running...' : 'Run Scheduler Now'}</span>
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-6 bg-[#FAF9F6] border-t border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-center gap-4">
            {isSimulationAllowed ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#6B6B6B]">Development / Testing Tools:</span>
                <button
                  type="button"
                  onClick={() => setDevToolsEnabled(!devToolsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A880] focus:ring-offset-2 ${
                    devToolsEnabled ? 'bg-[#C5A880]' : 'bg-[#E5E5E5]'
                  }`}
                  title="Toggle Development / Testing Tools"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      devToolsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-bold ${devToolsEnabled ? 'text-[#7D5E46]' : 'text-[#6B6B6B]'}`}>
                  {devToolsEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            ) : (
              <div />
            )}

            <Button
              type="submit"
              variant="gradient"
              disabled={!isAdmin || saveMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4 text-[#C5A880]" />
              <span>{saveMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
            </Button>
          </CardFooter>
        </form>
      </Card>

      <SimulateTimeModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
      />
    </div>
  );
};
