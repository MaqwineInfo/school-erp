import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { ScrollText, Search, Filter, AlertTriangle, Info, Shield } from 'lucide-react';

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

interface AuditLog {
  _id: string;
  userEmail: string;
  userName: string;
  userRole: string;
  module: string;
  action: string;
  resourceType: string;
  resourceLabel?: string;
  ip?: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[severity] || map.info}`}>
      {severity}
    </span>
  );
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (severity === 'warning') return <Shield className="w-4 h-4 text-yellow-500" />;
  return <Info className="w-4 h-4 text-blue-400" />;
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ module: '', severity: '', from: '', to: '', search: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (filters.module) params.set('module', filters.module);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      return get<{ data: AuditLog[]; meta: { total: number; page: number; totalPages: number } }>(`/audit-logs?${params}`);
    },
    staleTime: 30_000,
  });

  const logs: AuditLog[] = (data?.data as any)?.data || [];
  const meta = (data?.data as any)?.meta || {};

  const MODULES = ['admissions', 'students', 'fees', 'payroll', 'examinations', 'hr', 'certificates', 'settings', 'role_management', 'auth'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gray-900 text-white p-2.5 rounded-xl">
          <ScrollText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Immutable record of all sensitive system actions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search user/action..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <select value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300">
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
          </select>

          <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300">
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />

          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: meta.total ?? '—', color: 'bg-gray-900 text-white' },
          { label: 'Critical Actions', value: '—', color: 'bg-red-600 text-white' },
          { label: 'This Week', value: '—', color: 'bg-blue-600 text-white' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" /> Audit Events
          </h2>
          <span className="text-xs text-gray-400">{meta.total ?? 0} total records</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No audit logs found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <SeverityIcon severity={log.severity} />
                        <SeverityBadge severity={log.severity} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {log.createdAt ? formatTimestamp(log.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{log.userName || '—'}</p>
                      <p className="text-xs text-gray-400">{log.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {log.userRole?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.resourceLabel || log.resourceType || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {meta.page} of {meta.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
