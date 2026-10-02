import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RepoItem, BadgeStatus, AccessStatus, RepoLifecycleStatus } from '@repo-manager/shared';
import { RepoDetailsModal } from '../components/RepoDetailsModal';
import {
  Search,
  ArrowUpDown,
  FolderGit2,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const Dashboard: React.FC = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'daysRemaining'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);

  const { data: response, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['repos', search, role, status, sortBy, order, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      if (sortBy) params.append('sortBy', sortBy);
      if (order) params.append('order', order);
      params.append('page', page.toString());
      params.append('limit', '10');

      const res: any = await apiClient.get(`/dashboard/repos?${params.toString()}`);
      return res.data;
    },
  });

  const repos: RepoItem[] = response?.repos || [];
  const totalPages = response?.totalPages || 1;
  const total = response?.total || 0;
  const availableRoles: string[] = response?.availableRoles || [];

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

  const getAccessBadgeVariant = (access: AccessStatus) => {
    switch (access) {
      case 'Active Outside Access':
        return 'warning';
      case 'Clean / Revoked':
        return 'success';
      case 'Internal Only':
        return 'secondary';
    }
  };

  const getRepoStatusBadgeVariant = (status: RepoLifecycleStatus) => {
    switch (status) {
      case 'Live':
        return 'success';
      case 'Archived':
        return 'secondary';
      case 'Pending Deletion':
        return 'destructive';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Repository Governance Dashboard
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1.5 flex items-center gap-1.5 font-medium">
            <span>Managing candidate practical test repositories matching prefix</span>
            <code className="font-mono text-[#7D5E46] bg-[#F5EFE6] px-1.5 py-0.5 rounded border border-[#E8DBCB]">pt-*</code>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 border-[#E5E5E5] bg-white hover:bg-[#FDFBF7] text-[#1A1A1A] self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#C5A880]' : 'text-[#7D5E46]'}`} />
          <span>Refresh Repositories</span>
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="stat-card">
          <div className="p-3 bg-[#F5EFE6] text-[#7D5E46] rounded-xl border border-[#E8DBCB]">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#A39281] uppercase tracking-widest">Total Repos</span>
            <div className="text-2xl font-serif font-bold text-[#1A1A1A]">{total}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#A39281] uppercase tracking-widest">Healthy (&gt;30d)</span>
            <div className="text-2xl font-serif font-bold text-emerald-900">
              {repos.filter((r) => r.badgeStatus === BadgeStatus.GREEN).length}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#A39281] uppercase tracking-widest">Warning (10-30d)</span>
            <div className="text-2xl font-serif font-bold text-amber-900">
              {repos.filter((r) => r.badgeStatus === BadgeStatus.AMBER).length}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#A39281] uppercase tracking-widest">Critical (&lt;10d)</span>
            <div className="text-2xl font-serif font-bold text-rose-900">
              {repos.filter((r) => !r.isArchived && (r.badgeStatus === BadgeStatus.RED || r.badgeStatus === BadgeStatus.EXPIRED)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-[#E5E5E5] bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39281]" />
            <Input
              type="text"
              placeholder="Search repo, candidate or role..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] placeholder:text-[#9A9A9A]"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-md border border-[#E5E5E5] bg-white text-xs text-[#1A1A1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
            >
              <option value="">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  Role: {r}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-md border border-[#E5E5E5] bg-white text-xs text-[#1A1A1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
            >
              <option value="">All Statuses</option>
              <option value={BadgeStatus.GREEN}>Green (&gt; 30 Days)</option>
              <option value={BadgeStatus.AMBER}>Amber (10 - 30 Days)</option>
              <option value={BadgeStatus.RED}>Red (&lt; 10 Days)</option>
              <option value={BadgeStatus.EXPIRED}>Expired</option>
            </select>

            <div className="flex items-center gap-1 border border-[#E5E5E5] rounded-md px-2.5 h-10 bg-white">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#A39281]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1 text-xs bg-transparent text-[#1A1A1A] font-medium focus:outline-none cursor-pointer"
              >
                <option value="createdAt">Created Date</option>
                <option value="name">Repo Name</option>
                <option value="daysRemaining">Days Remaining</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                className="text-xs font-mono font-bold text-[#7D5E46] hover:text-[#1A1A1A] h-7 px-1.5 hover:bg-[#F5EFE6]"
                title="Toggle Ascending/Descending"
              >
                {order.toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden shadow-md">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#6B6B6B] flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#C5A880]" />
            <span>Fetching live repository data from GitHub API...</span>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-rose-800 font-medium bg-rose-50">
            {(error as any)?.message || 'Failed to load repositories.'}
          </div>
        ) : repos.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#6B6B6B] flex flex-col items-center gap-2">
            <Layers className="w-8 h-8 text-[#C5A880]" />
            <span>No matching repositories found with prefix <code className="text-[#1A1A1A] font-mono">pt-*</code></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E5E5] text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                  <th className="py-4 px-4">Repository Name</th>
                  <th className="py-4 px-4">Candidate</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Access Status</th>
                  <th className="py-4 px-4">Repo Status</th>
                  <th className="py-4 px-4 text-center">Days Left</th>
                  <th className="py-4 px-4">Countdown Badge</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-xs">
                {repos.map((repo) => {
                  return (
                    <tr key={repo.name} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-[#1A1A1A]">
                        <div className="flex items-center gap-2.5">
                          <FolderGit2 className="w-4 h-4 text-[#C5A880] shrink-0" />
                          <span>{repo.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1A1A1A]">{repo.candidateName}</td>
                      <td className="py-4 px-4">
                        <Badge variant="gold" className="font-mono text-[11px]">
                          {repo.role}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={getAccessBadgeVariant(repo.accessStatus)} className="gap-1">
                          <Shield className="w-3 h-3" />
                          {repo.accessStatus}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={getRepoStatusBadgeVariant(repo.repoStatus)} className="gap-1">
                          <Activity className="w-3 h-3" />
                          {repo.repoStatus}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-[#1A1A1A] font-mono text-sm">
                        {repo.isArchived ? '—' : `${repo.daysRemaining}d`}
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={getBadgeVariant(repo.badgeStatus)}>
                          {repo.daysRemaining > 0 ? `${repo.daysRemaining} days left` : 'Expired'}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedRepo(repo)}
                          className="gap-1.5 text-xs h-8"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Manage</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-[#FAF9F6] border-t border-[#E5E5E5] text-xs text-[#6B6B6B]">
            <span>
              Page <strong className="text-[#1A1A1A]">{page}</strong> of{' '}
              <strong className="text-[#1A1A1A]">{totalPages}</strong> ({total} total items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 border-[#E5E5E5] bg-white text-[#1A1A1A]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 border-[#E5E5E5] bg-white text-[#1A1A1A]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details & Actions Modal */}
      <RepoDetailsModal
        repo={selectedRepo}
        isOpen={!!selectedRepo}
        onClose={() => setSelectedRepo(null)}
      />
    </div>
  );
};
