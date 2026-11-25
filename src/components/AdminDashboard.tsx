import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ComplaintRecord,
  ComplaintStatus,
  DashboardStats,
  IssueCategory,
} from '../types/complaint';
import { CategoryBarChart, StatusDoughnutChart } from './ChartWidgets';

interface AdminDashboardProps {
  categories: IssueCategory[];
  token: string | null;
  onTokenChange: (token: string | null) => void;
}

export function AdminDashboard({
  categories,
  token,
  onTokenChange,
}: AdminDashboardProps) {
  const [authStatus, setAuthStatus] = useState<{
    loading: boolean;
    needsSetup: boolean;
    usesEnvPasscode: boolean;
  }>({ loading: true, needsSetup: false, usesEnvPasscode: false });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | ComplaintStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | IssueCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Check server auth status (first-run claim vs login)
  useEffect(() => {
    let active = true;
    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setAuthStatus({
            loading: false,
            needsSetup: Boolean(data.needsSetup),
            usesEnvPasscode: Boolean(data.usesEnvPasscode),
          });
        }
      })
      .catch(() => {
        if (active) {
          setAuthStatus({ loading: false, needsSetup: false, usesEnvPasscode: false });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingData(true);
    setDataError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') {
        params.set('status', statusFilter);
      }
      if (categoryFilter !== 'All') {
        params.set('category', categoryFilter);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [complaintsRes, statsRes] = await Promise.all([
        fetch(`/api/complaints?${params.toString()}`, { headers }),
        fetch('/api/stats', { headers }),
      ]);

      if (complaintsRes.status === 401 || statsRes.status === 401) {
        onTokenChange(null);
        setAuthError('Your administrator session expired. Please sign in again.');
        return;
      }

      if (!complaintsRes.ok || !statsRes.ok) {
        setDataError('Failed to load complaint records from database.');
        return;
      }

      const complaintsData = await complaintsRes.json();
      const statsData = await statsRes.json();
      setComplaints(complaintsData.complaints ?? []);
      setStats(statsData as DashboardStats);
    } catch {
      setDataError('Network error while connecting to backend database.');
    } finally {
      setLoadingData(false);
    }
  }, [token, statusFilter, categoryFilter, searchQuery, onTokenChange]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, fetchDashboardData]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authStatus.needsSetup) {
      if (password.trim().length < 6) {
        setAuthError('Administrator password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    } else if (!password.trim()) {
      setAuthError('Please enter the administrator password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const endpoint = authStatus.needsSetup ? '/api/admin/claim' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      setAuthStatus((prev) => ({ ...prev, needsSetup: false }));
      setPassword('');
      setConfirmPassword('');
      onTokenChange(data.token);
    } catch {
      setAuthError('Unable to connect to authentication service.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleStatusChange = async (complaint: ComplaintRecord, nextStatus: ComplaintStatus) => {
    if (!token) {
      return;
    }
    setUpdatingId(complaint.id);
    setDataError(null);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.status === 401) {
        onTokenChange(null);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        setDataError(err.error || 'Failed to update complaint status.');
        return;
      }

      const data = await res.json();
      const updated = data.complaint as ComplaintRecord;
      if (selectedComplaint?.id === updated.id) {
        setSelectedComplaint(updated);
      }
      await fetchDashboardData();
    } catch {
      setDataError('Failed to update complaint status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      return;
    }
    setUpdatingId(id);
    setDataError(null);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        onTokenChange(null);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        setDataError(err.error || 'Failed to delete complaint record.');
        return;
      }

      if (selectedComplaint?.id === id) {
        setSelectedComplaint(null);
      }
      setConfirmDeleteId(null);
      await fetchDashboardData();
    } catch {
      setDataError('Failed to delete complaint record.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = () => {
    if (complaints.length === 0) {
      return;
    }
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const headers = [
      'Complaint Code',
      'Student Name',
      'Student ID',
      'Category',
      'Location',
      'Description',
      'Status',
      'Submitted At',
    ];
    const rows = complaints.map((c) => [
      escapeCell(c.complaint_code),
      escapeCell(c.student_name),
      escapeCell(c.student_id),
      escapeCell(c.category),
      escapeCell(c.location),
      escapeCell(c.description),
      escapeCell(c.status),
      escapeCell(c.created_at),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `campus-complaints-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Unauthenticated View: First-Run Setup OR Sign In
  if (!token) {
    return (
      <section className="mx-auto max-w-md py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                {authStatus.loading
                  ? 'Checking Admin Access...'
                  : authStatus.needsSetup
                    ? 'Claim Administrator Password'
                    : 'Administrator Sign In'}
              </h1>
              <p className="text-xs text-slate-500">
                {authStatus.needsSetup
                  ? 'First-time setup: create a secure password to lock the Admin Console.'
                  : 'Authorized campus administrators only.'}
              </p>
            </div>
          </div>

          {!authStatus.loading && (
            <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="adminPassword"
                  className="block text-sm font-medium text-slate-800"
                >
                  {authStatus.needsSetup ? 'New Administrator Password' : 'Administrator Password'}
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authStatus.needsSetup ? 'Minimum 6 characters' : 'Enter password'}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              {authStatus.needsSetup && (
                <div>
                  <label
                    htmlFor="confirmAdminPassword"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmAdminPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {authSubmitting
                  ? 'Verifying...'
                  : authStatus.needsSetup
                    ? 'Set Password & Open Console'
                    : 'Sign In to Admin Console'}
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Administrator Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review submitted campus complaints, update resolution status, and inspect live category analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loadingData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={complaints.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onTokenChange(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {dataError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{dataError}</span>
        </div>
      )}

      {/* KPI Strip (FR-5.1 to FR-5.3) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Complaints</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {stats ? stats.total : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-amber-700">Pending Complaints</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {stats ? stats.pending : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-emerald-700">Resolved Complaints</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {stats ? stats.resolved : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Resolution Rate</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {stats ? `${stats.resolutionRate}%` : '—'}
          </p>
        </div>
      </div>

      {/* Chart.js Analytics Section (FR-5.4 to FR-5.8) */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Category-Wise Complaints
                </h2>
                <p className="text-xs text-slate-500">
                  Live distribution across campus categories from SQLite records
                </p>
              </div>
            </div>
            <CategoryBarChart stats={stats} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
            <div className="mb-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Resolution Status
              </h2>
              <p className="text-xs text-slate-500">
                Current Pending vs Resolved breakdown
              </p>
            </div>
            <StatusDoughnutChart stats={stats} />
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200 pt-2 text-xs">
              {stats.byCategory
                .filter((c) => c.total > 0)
                .slice(0, 4)
                .map((c) => (
                  <div key={c.category} className="flex items-center justify-between py-2">
                    <span className="truncate text-slate-700">{c.category}</span>
                    <span className="font-mono text-slate-900 tabular-nums shrink-0">
                      {c.total} ({c.pending} pending)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Complaints Table (FR-4.2 to FR-4.12) */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Submitted Complaints
            </h2>
            <p className="text-xs text-slate-500">
              Click any complaint to inspect full student details or update status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:w-64 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, student, location..."
                aria-label="Search complaints"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | IssueCategory)}
              aria-label="Filter by category"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Segmented Status Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['All', 'Pending', 'Resolved'] as const).map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3 whitespace-nowrap">Ref ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Student</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Location</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loadingData && complaints.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      No matching complaints found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Adjust your search query or filters to see other records.
                    </p>
                    {(statusFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('All');
                          setCategoryFilter('All');
                          setSearchQuery('');
                        }}
                        className="mt-4 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                complaints.map((item) => {
                  const isPending = item.status === 'Pending';
                  const isBusy = updatingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {item.complaint_code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {item.student_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {item.student_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-[200px] truncate">
                        {item.location}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isPending ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {isPending ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedComplaint(item)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(item, isPending ? 'Resolved' : 'Pending')
                            }
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                              isPending
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isPending ? 'Mark Resolved' : 'Reopen'}
                          </button>

                          {confirmDeleteId === item.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDelete(item.id)}
                                className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Delete complaint ${item.complaint_code}`}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complaint Details Modal (FR-4.3 to FR-4.10) */}
      {selectedComplaint && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="complaint-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                  {selectedComplaint.complaint_code}
                </p>
                <h3
                  id="complaint-detail-title"
                  className="mt-1 font-display text-lg font-bold text-slate-900"
                >
                  Complaint Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                aria-label="Close detail dialog"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Student Name</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {selectedComplaint.student_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Student ID</dt>
                <dd className="mt-1 font-mono text-sm text-slate-900">
                  {selectedComplaint.student_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Issue Category</dt>
                <dd className="mt-1 text-sm text-slate-900">{selectedComplaint.category}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Current Status</dt>
                <dd
                  className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${
                    selectedComplaint.status === 'Pending'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {selectedComplaint.status === 'Pending' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>{selectedComplaint.status}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Campus Location</dt>
                <dd className="mt-1 text-sm text-slate-900">{selectedComplaint.location}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Issue Description</dt>
                <dd className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800">
                  {selectedComplaint.description}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Submitted At</dt>
                <dd className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                  {new Date(selectedComplaint.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Last Updated</dt>
                <dd className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                  {new Date(selectedComplaint.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                disabled={updatingId === selectedComplaint.id}
                onClick={() => handleDelete(selectedComplaint.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Complaint</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={updatingId === selectedComplaint.id}
                  onClick={() =>
                    handleStatusChange(
                      selectedComplaint,
                      selectedComplaint.status === 'Pending' ? 'Resolved' : 'Pending'
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer ${
                    selectedComplaint.status === 'Pending'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {selectedComplaint.status === 'Pending'
                    ? 'Mark as Resolved'
                    : 'Reopen as Pending'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
