import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RepoItem, CollaboratorItem, BadgeStatus } from '@repo-manager/shared';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Users,
  Calendar,
  Archive,
  Trash2,
  UserX,
  ExternalLink,
  ShieldAlert,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface RepoDetailsModalProps {
  repo: RepoItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RepoDetailsModal: React.FC<RepoDetailsModalProps> = ({
  repo,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [overrideDateInput, setOverrideDateInput] = useState('');
  const [overrideActionInput, setOverrideActionInput] = useState<'delete' | 'archive'>('delete');
  const [activeModal, setActiveModal] = useState<'archive' | 'delete' | 'revoke_one' | 'revoke_outside' | null>(null);
  const [targetCollaborator, setTargetCollaborator] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const repoName = repo?.name || '';

  // Fetch collaborators
  const { data: collaboratorsResponse, isLoading: loadingCollabs, refetch: refetchCollabs } = useQuery({
    queryKey: ['collaborators', repoName],
    queryFn: async () => {
      if (!repoName) return [];
      const res: any = await apiClient.get(`/repos/${repoName}/collaborators`);
      return (res.data || []) as CollaboratorItem[];
    },
    enabled: isOpen && !!repoName,
  });

  // Fetch provisioned DB users to cross-reference roles (username -> 'ADMIN' | 'USER')
  const { data: provisionedUsersData } = useQuery({
    queryKey: ['provisioned-users'],
    queryFn: async () => {
      const res: any = await apiClient.get('/auth/users');
      return (res.data?.data || []) as { username: string; role: string }[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // cache for 5 min, this data rarely changes
  });

  const provisionedUsers: Record<string, string> = React.useMemo(() => {
    if (!provisionedUsersData) return {};
    return Object.fromEntries(
      provisionedUsersData.map((u) => [u.username.toLowerCase(), u.role])
    );
  }, [provisionedUsersData]);

  const collaborators = collaboratorsResponse || [];
  const outsideCount = collaborators.filter((c) => c.isOutside).length;

  // Revoke single collaborator mutation
  const revokeOneMutation = useMutation({
    mutationFn: async (username: string) => {
      return apiClient.post(`/repos/${repoName}/revoke`, { username });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Collaborator revoked successfully' });
      refetchCollabs();
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setActiveModal(null);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  // Revoke all outside collaborators mutation
  const revokeOutsideMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/repos/${repoName}/revoke-outside`);
    },
    onSuccess: (res: any) => {
      setFeedback({ type: 'success', message: res.message || 'Outside collaborators revoked' });
      refetchCollabs();
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setActiveModal(null);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  // Archive repo mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/repos/${repoName}/archive`);
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Repository archived successfully' });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setActiveModal(null);
      onClose();
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  // Delete repo mutation
  const deleteMutation = useMutation({
    mutationFn: async (confirmName: string) => {
      return apiClient.post(`/repos/${repoName}/delete`, { confirmRepoName: confirmName });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Repository deleted permanently' });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setActiveModal(null);
      onClose();
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  // Set override date mutation
  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!overrideDateInput) return;
      return apiClient.post(`/repos/${repoName}/override-date`, {
        customExpiryDate: new Date(overrideDateInput).toISOString(),
        customAction: overrideActionInput,
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Expiry override date saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  if (!repo) return null;

  const getBadgeVariant = (status: BadgeStatus) => {
    switch (status) {
      case BadgeStatus.GREEN:
        return 'success';
      case BadgeStatus.AMBER:
        return 'warning';
      case BadgeStatus.RED:
        return 'destructive';
      case BadgeStatus.EXPIRED:
        return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-[#E5E5E5] bg-white text-[#1A1A1A] p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-[#FAF9F6] border-b border-[#E5E5E5] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-serif font-bold text-xl text-[#1A1A1A] tracking-tight">{repo.name}</h2>
              <Badge variant={getBadgeVariant(repo.badgeStatus)}>
                {repo.daysRemaining > 0 ? `${repo.daysRemaining} days left` : 'Expired'}
              </Badge>
              {repo.isArchived && (
                <Badge variant="secondary">
                  Archived
                </Badge>
              )}
            </div>
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#C5A880] hover:text-[#7D5E46] flex items-center gap-1.5 font-semibold text-xs transition-colors"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-xs text-[#6B6B6B]">
            Candidate: <strong className="text-[#1A1A1A] font-mono">{repo.candidateName}</strong> | Role:{' '}
            <strong className="text-[#1A1A1A] font-mono">{repo.role}</strong>
          </p>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-[#F5EFE6] text-[#5E4432] border-b border-[#E8DBCB]'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <span>{feedback.message}</span>
            <Button variant="link" size="sm" onClick={() => setFeedback(null)} className="h-auto p-0 text-[#1A1A1A] underline">
              Dismiss
            </Button>
          </div>
        )}

        {/* Tabbed Content Body */}
        <div className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-[#F5EFE6] border-[#E5E5E5] mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <Info className="w-4 h-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="gap-2">
                <Users className="w-4 h-4" /> Collaborators ({collaborators.length})
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Policy & Actions
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E5E5] text-xs">
                <div>
                  <span className="text-[#6B6B6B] block mb-1">Created On</span>
                  <strong className="text-[#1A1A1A] text-sm font-mono">
                    {new Date(repo.createdAt).toLocaleDateString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[#6B6B6B] block mb-1">Days Active</span>
                  <strong className="text-[#1A1A1A] text-sm font-mono">{repo.daysSinceCreation} days</strong>
                </div>
                <div>
                  <span className="text-[#6B6B6B] block mb-1">Days Remaining</span>
                  <strong className="text-[#1A1A1A] text-sm font-mono">{repo.daysRemaining} days</strong>
                </div>
                <div>
                  <span className="text-[#6B6B6B] block mb-1">Access Status</span>
                  <Badge variant={(repo.outsideCollaboratorsCount || 0) > 0 ? 'warning' : 'success'}>
                    {repo.accessStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#E5E5E5] flex items-start gap-3 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-[#C5A880] shrink-0 mt-0.5" />
                <div className="text-xs text-[#5A5A5A]">
                  <span className="font-bold text-[#1A1A1A] block mb-1">Repository Retention Policy</span>
                  Automated deletion or archiving occurs when remaining days reach 0. Expiry warnings generate in-app alert notifications for Tech Leads within 7 days.
                </div>
              </div>
            </TabsContent>

            {/* Collaborators Tab */}
            <TabsContent value="collaborators" className="space-y-4">
              <div className="flex justify-between items-center bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E5E5]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]">
                  <Users className="w-4 h-4 text-[#C5A880]" />
                  <span>GitHub Access Collaborators</span>
                </div>
                {outsideCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setActiveModal('revoke_outside')}
                    className="gap-1.5 text-xs"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Revoke All Outside ({outsideCount})
                  </Button>
                )}
              </div>

              {loadingCollabs ? (
                <div className="py-8 text-center text-xs text-[#6B6B6B] animate-pulse">
                  Fetching collaborators from GitHub...
                </div>
              ) : collaborators.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B6B6B]">No collaborators found</div>
              ) : (
                <div className="divide-y divide-[#E5E5E5] max-h-56 overflow-y-auto pr-1">
                  {[...collaborators]
                    .sort((a, b) => {
                      // Outside collaborators first
                      if (a.isOutside && !b.isOutside) return -1;
                      if (!a.isOutside && b.isOutside) return 1;
                      return a.username.localeCompare(b.username);
                    })
                    .map((collab) => {
                      // Determine display role: for non-outside collabs look up DB role
                      const dbEntry = provisionedUsers[collab.username.toLowerCase()];
                      let displayRole: string;
                      if (collab.isOutside) {
                        displayRole = collab.roleName || 'outside';
                      } else if (dbEntry) {
                        displayRole = dbEntry === 'ADMIN' ? 'Admin' : 'User';
                      } else {
                        displayRole = 'User';
                      }

                      return (
                        <div key={collab.username} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar src={collab.avatarUrl} alt={collab.username} fallback={collab.username.substring(0, 2)} />
                            <div>
                              <span className="text-xs font-bold text-[#1A1A1A] block">{collab.username}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#6B6B6B] capitalize">{displayRole}</span>
                                {collab.isOutside && (
                                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                                    Outside Collaborator
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {collab.isOutside ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTargetCollaborator(collab.username);
                                setActiveModal('revoke_one');
                              }}
                              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                            >
                              Revoke Access
                            </Button>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-[#FAF9F6] text-[11px] font-semibold text-[#6B6B6B]">
                              🔒 Protected
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Policy & Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              {/* Custom Expiry Override */}
              <div className="border border-[#E5E5E5] rounded-xl p-4 bg-[#FAF9F6] space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C5A880]" />
                  <h3 className="font-bold text-sm text-[#1A1A1A]">Retention Expiry Override</h3>
                </div>
                <p className="text-xs text-[#6B6B6B]">
                  Override default retention period for this specific practical test repository.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Input
                    type="date"
                    defaultValue={repo.customExpiryDate ? repo.customExpiryDate.split('T')[0] : ''}
                    onChange={(e) => setOverrideDateInput(e.target.value)}
                    className="w-auto bg-white border-[#E5E5E5] text-xs text-[#1A1A1A]"
                  />
                  <select
                    value={overrideActionInput}
                    onChange={(e) => setOverrideActionInput(e.target.value as any)}
                    className="h-10 px-3 rounded-md border border-[#E5E5E5] bg-white text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                  >
                    <option value="delete">Auto-Delete on Expiry</option>
                    <option value="archive">Auto-Archive on Expiry</option>
                  </select>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => overrideMutation.mutate()}
                    disabled={overrideMutation.isPending || !overrideDateInput}
                  >
                    {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
                  </Button>
                </div>
              </div>

              {/* Lifecycle Actions */}
              <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/30 space-y-3">
                <h3 className="font-bold text-xs text-rose-800 uppercase tracking-wider">
                  Lifecycle Operations
                </h3>
                <div className="flex flex-wrap gap-3">
                  {!repo.isArchived && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveModal('archive')}
                      className="gap-2 bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                    >
                      <Archive className="w-4 h-4 text-amber-700" />
                      Archive Repository
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setActiveModal('delete')}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Repository Permanently
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={activeModal === 'archive'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => archiveMutation.mutate()}
          title="Archive Repository"
          description={`Are you sure you want to archive '${repo.name}'? This will set the repository to read-only on GitHub.`}
          confirmText="Archive Repository"
          danger={false}
          loading={archiveMutation.isPending}
        />

        <ConfirmationModal
          isOpen={activeModal === 'delete'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => deleteMutation.mutate(repo.name)}
          title="Delete Repository Permanently"
          description={`WARNING: This action CANNOT be undone. This will permanently delete '${repo.name}' from GitHub.`}
          confirmText="Delete Repository"
          requiredTypedText={repo.name}
          danger={true}
          loading={deleteMutation.isPending}
        />

        <ConfirmationModal
          isOpen={activeModal === 'revoke_one'}
          onClose={() => {
            setActiveModal(null);
            setTargetCollaborator(null);
          }}
          onConfirm={() => {
            if (targetCollaborator) revokeOneMutation.mutate(targetCollaborator);
          }}
          title="Revoke Collaborator Access"
          description={`Are you sure you want to remove '${targetCollaborator}' from repository '${repo.name}'?`}
          confirmText="Revoke Access"
          danger={true}
          loading={revokeOneMutation.isPending}
        />

        <ConfirmationModal
          isOpen={activeModal === 'revoke_outside'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => revokeOutsideMutation.mutate()}
          title="Remove All Outside Collaborators"
          description={`Are you sure you want to remove all ${outsideCount} outside collaborators from '${repo.name}'?`}
          confirmText="Remove All Outside Collaborators"
          danger={true}
          loading={revokeOutsideMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
};
