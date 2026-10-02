import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { AuditLogDto } from '@repo-manager/shared';
import { History, Download, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight, Hash, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const AuditLogPage: React.FC = () => {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [repository, setRepository] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useQuery({
    queryKey: ['auditLogs', actor, action, repository, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actor) params.append('actor', actor);
      if (action) params.append('action', action);
      if (repository) params.append('repository', repository);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', '15');

      const res: any = await apiClient.get(`/audit?${params.toString()}`);
      return res.data;
    },
  });

  // Verify SHA-256 Hash Chain Integrity
  const { data: verification } = useQuery({
    queryKey: ['auditVerify'],
    queryFn: async () => {
      const res: any = await apiClient.get('/audit/verify');
      return res.data as { isChainValid: boolean; totalChecked: number; tamperedRecordId: string | null };
    },
  });

  const logs: AuditLogDto[] = response?.logs || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (actor) params.append('actor', actor);
    if (action) params.append('action', action);
    if (repository) params.append('repository', repository);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    window.open(`${backendUrl}/audit/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1A1A1A] text-[#FDFBF7] rounded-xl shadow-md border border-[#C5A880]/40">
            <History className="w-6 h-6 text-[#C5A880]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
              Audit Trail Logs
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-0.5 font-medium">
              Append-only, cryptographic SHA-256 hash-chained tamper-evident activity logs
            </p>
          </div>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={handleExportCsv}
          className="gap-2 self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-[#C5A880]" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* SHA-256 Hash Chain Verification Shield Banner */}
      {verification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm backdrop-blur-xl ${
            verification.isChainValid
              ? 'bg-emerald-50 text-[#1A1A1A] border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3 font-semibold">
            {verification.isChainValid ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0" />
            )}
            <div>
              <span className="block font-serif font-bold text-sm text-[#1A1A1A]">
                {verification.isChainValid
                  ? 'SHA-256 Merkle Chain Verified (Audit Integrity Intact)'
                  : 'TAMPER ALERT: Audit Log Hash Chain Mismatch Detected!'}
              </span>
              <span className="text-xs text-[#6B6B6B] font-medium">
                {verification.isChainValid
                  ? `All ${verification.totalChecked} audit records are cryptographically linked & validated.`
                  : `Tampering detected at record ID: ${verification.tamperedRecordId}`}
              </span>
            </div>
          </div>
          <Badge variant="gold" className="font-mono text-[10px] uppercase font-bold py-1 px-2.5 gap-1 hidden sm:inline-flex shadow-sm">
            <Hash className="w-3 h-3 text-[#7D5E46]" />
            SHA-256 Merkle Chain
          </Badge>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="border-[#E5E5E5] bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-1">Actor</label>
          <Input
            type="text"
            placeholder="Filter by user..."
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(1);
            }}
            className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] placeholder:text-[#9A9A9A]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-1">Action</label>
          <Input
            type="text"
            placeholder="Filter by action..."
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] placeholder:text-[#9A9A9A]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-1">Repository</label>
          <Input
            type="text"
            placeholder="Filter by repo..."
            value={repository}
            onChange={(e) => {
              setRepository(e.target.value);
              setPage(1);
            }}
            className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A] placeholder:text-[#9A9A9A]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-1">From Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-1">To Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="bg-white border-[#E5E5E5] text-xs text-[#1A1A1A]"
          />
        </div>
      </Card>

      {/* Audit Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden shadow-md">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#6B6B6B]">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#6B6B6B] flex flex-col items-center gap-2">
            <Layers className="w-8 h-8 text-[#C5A880]" />
            <span>No audit logs found matching specified criteria.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E5E5] text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                  <th className="py-4 px-4">Timestamp (UTC)</th>
                  <th className="py-4 px-4">Actor</th>
                  <th className="py-4 px-4">Action</th>
                  <th className="py-4 px-4">Repository</th>
                  <th className="py-4 px-4">IP Address</th>
                  <th className="py-4 px-4">SHA-256 Hash</th>
                  <th className="py-4 px-4">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="py-3.5 px-4 text-[#6B6B6B]">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1A1A] font-sans">{log.actor}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="gold" className="font-sans text-[11px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1A1A]">{log.repository}</td>
                    <td className="py-3.5 px-4 text-[#1A1A1A] font-bold">{log.ipAddress}</td>
                    <td className="py-3.5 px-4 text-[#A39281] font-mono text-[10px]" title={`Prev: ${log.previousHash || 'GENESIS'}`}>
                      {log.hash ? `${log.hash.substring(0, 14)}...` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5A5A] max-w-xs truncate font-sans text-[11px]">
                      {log.context ? JSON.stringify(log.context) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-[#FAF9F6] border-t border-[#E5E5E5] text-xs text-[#6B6B6B]">
            <span>
              Page <strong className="text-[#1A1A1A]">{page}</strong> of{' '}
              <strong className="text-[#1A1A1A]">{totalPages}</strong> ({total} total logs)
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
    </div>
  );
};
