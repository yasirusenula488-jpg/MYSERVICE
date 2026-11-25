import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  CreditCard,
  Database,
  DollarSign,
  Edit3,
  FileText,
  FolderTree,
  LayoutDashboard,
  Mail,
  PlusCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { usePageMeta } from '../components/PageMeta';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../data/sampleCatalog';
import {
  adminDeleteCategory,
  adminFetchAllOverviewData,
  adminProcessPaymentRefund,
  adminReviewProvider,
  adminSaveCategory,
  adminSaveSettings,
  adminSaveSubscriptionPlan,
  adminSyncDefaultCatalog,
  adminToggleListingFeatured,
  adminToggleUserAccountStatus,
  adminUpdateReportOrDispute,
  fetchAllCategoriesAdmin,
  fetchPublicAdminSettings,
  fetchSubscriptionPlans,
  makeSafeId,
} from '../lib/marketplaceService';
import {
  AdminSettings,
  AuditLog,
  Booking,
  CommissionRecord,
  DisputeItem,
  FeaturedListing,
  JobRequest,
  PaymentRecord,
  ProviderProfile,
  ProviderVerification,
  ReportItem,
  ServiceCategory,
  ServiceListing,
  SubscriptionPlan,
  SubscriptionRecord,
  UserProfile,
  VerificationStatus,
} from '../types/marketplace';

type AdminTab =
  | 'overview'
  | 'users'
  | 'verification'
  | 'categories'
  | 'marketplace'
  | 'financial'
  | 'content'
  | 'reports';

interface AdminOverviewData {
  users: UserProfile[];
  providers: ProviderProfile[];
  verifications: ProviderVerification[];
  listings: ServiceListing[];
  jobs: JobRequest[];
  bookings: Booking[];
  subscriptions: SubscriptionRecord[];
  commissions: CommissionRecord[];
  payments: PaymentRecord[];
  reports: ReportItem[];
  disputes: DisputeItem[];
  auditLogs: AuditLog[];
  featuredListings: FeaturedListing[];
  contactMessages: { id: string; name: string; email: string; subject: string; message: string; createdAt?: unknown }[];
}

export const AdminDashboard: React.FC = () => {
  const { firebaseUser, isAdmin, authReady } = useAuth();
  usePageMeta('Admin Console', 'Platform operations, provider verification, category catalog, and financial management for MYSERVICE.');

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [data, setData] = useState<AdminOverviewData>({
    users: [],
    providers: [],
    verifications: [],
    listings: [],
    jobs: [],
    bookings: [],
    subscriptions: [],
    commissions: [],
    payments: [],
    reports: [],
    disputes: [],
    auditLogs: [],
    featuredListings: [],
    contactMessages: [],
  });
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [settings, setSettings] = useState<AdminSettings>({
    id: 'global',
    defaultCommissionPct: 10,
    announcement_en: '',
    announcement_si: '',
    announcement_ta: '',
    supportEmail: 'support@myservice.lk',
    supportPhone: '+94 11 000 0000',
    isPublic: true,
  });

  // Filters & interactive editing state
  const [userSearch, setUserSearch] = useState('');
  const [confirmUserAction, setConfirmUserAction] = useState<{ user: UserProfile; status: 'active' | 'suspended' } | null>(null);

  // Provider verification review modal
  const [reviewTarget, setReviewTarget] = useState<{ provider: ProviderProfile; verif?: ProviderVerification } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<VerificationStatus>('verified');
  const [reviewNotes, setReviewNotes] = useState('');

  // Category editor
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [catSubInput, setCatSubInput] = useState('');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<ServiceCategory | null>(null);

  // Marketplace sub-tab
  const [marketSubTab, setMarketSubTab] = useState<'listings' | 'jobs' | 'bookings' | 'safety' | 'inbox'>('listings');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // Financial plan editor & refund confirm
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFeaturesText, setPlanFeaturesText] = useState('');
  const [confirmRefundPayment, setConfirmRefundPayment] = useState<PaymentRecord | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [overview, cats, subPlans, pubSettings] = await Promise.all([
        adminFetchAllOverviewData(),
        fetchAllCategoriesAdmin(),
        fetchSubscriptionPlans(),
        fetchPublicAdminSettings(),
      ]);
      setData(overview);
      setCategories(cats);
      setPlans(subPlans);
      setSettings(pubSettings);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load admin console data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && isAdmin) {
      loadAll();
    } else if (authReady) {
      setLoading(false);
    }
  }, [authReady, isAdmin]);

  const metrics = useMemo(() => {
    const pendingProviders = data.providers.filter((p) => p.verificationStatus === 'pending_review').length;
    const completedBookings = data.bookings.filter((b) => b.status === 'completed').length;
    const totalCommission = data.commissions.reduce((acc, c) => acc + (c.commissionAmountLkr || 0), 0);
    const openReports = data.reports.filter((r) => r.status === 'open').length;
    const openDisputes = data.disputes.filter((d) => d.status === 'open').length;
    return {
      totalUsers: data.users.length,
      totalProviders: data.providers.length,
      pendingProviders,
      totalListings: data.listings.length,
      activeJobs: data.jobs.filter((j) => ['open', 'quoted', 'assigned'].includes(j.status)).length,
      totalBookings: data.bookings.length,
      completedBookings,
      activeSubscriptions: data.subscriptions.filter((s) => s.status === 'active').length,
      totalCommission,
      safetyCount: openReports + openDisputes,
    };
  }, [data]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.district || '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [data.users, userSearch]);

  if (!authReady) {
    return <div className="p-12 text-center text-sm text-slate-500">Checking administrator credentials...</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-[70vh] bg-[#F5F8FD] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <Shield className="w-10 h-10 text-[#2563EB] mx-auto" />
          <h1 className="text-xl font-bold text-[#142B4A]">Admin Sign-In Required</h1>
          <p className="text-sm text-slate-600">Sign in with your authorized administrator Google account.</p>
          <Link to="/login" className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] bg-[#F5F8FD] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-xl font-bold text-[#142B4A]">Administrator Access Denied</h1>
          <p className="text-sm text-slate-600">
            This console is restricted to verified MYSERVICE administrators. Your regular Customer and Provider Mode features remain available in your dashboard.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
              Customer Dashboard
            </Link>
            <Link to="/" className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const adminEmail = firebaseUser.email || '';

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: '1. Dashboard Overview', icon: LayoutDashboard },
    { id: 'users', label: '2. User Management', icon: Users, badge: metrics.totalUsers },
    { id: 'verification', label: '3. Provider Verification', icon: ShieldCheck, badge: metrics.pendingProviders },
    { id: 'categories', label: '4. Category Management', icon: FolderTree, badge: categories.length },
    { id: 'marketplace', label: '5. Marketplace & Safety', icon: Briefcase, badge: metrics.safetyCount },
    { id: 'financial', label: '6. Financial & Plans', icon: DollarSign },
    { id: 'content', label: '7. Content & Support', icon: FileText },
    { id: 'reports', label: '8. Reports & Audit Logs', icon: BarChart3 },
  ];

  const handleSyncCatalog = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await adminSyncDefaultCatalog(firebaseUser.uid, adminEmail);
      await loadAll();
      setFeedback('Synced 15 trilingual categories, 3 subscription plans, and default global settings to Firestore.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    if (reviewDecision === 'rejected' && reviewNotes.trim().length < 5) {
      setErrorMsg('Please include a clear rejection reason for the provider.');
      return;
    }
    setBusy(true);
    try {
      await adminReviewProvider({
        adminUid: firebaseUser.uid,
        adminEmail,
        provider: reviewTarget.provider,
        decision: reviewDecision,
        notes: reviewNotes,
      });
      setFeedback(`Updated verification for ${reviewTarget.provider.businessName || reviewTarget.provider.fullName} to "${reviewDecision}".`);
      setReviewTarget(null);
      setReviewNotes('');
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification update failed.');
    } finally {
      setBusy(false);
    }
  };

  const openNewCategory = () => {
    const nextOrder = categories.length + 1;
    setEditingCat({
      id: makeSafeId('cat'),
      slug: `category-${nextOrder}`,
      name_en: '',
      name_si: '',
      name_ta: '',
      description_en: '',
      iconName: 'Grid',
      subcategories: ['General Service'],
      sortOrder: nextOrder,
      requiresSpecialistVerification: false,
      isActive: true,
    });
    setCatSubInput('General Service');
  };

  const openEditCategory = (cat: ServiceCategory) => {
    setEditingCat({ ...cat });
    setCatSubInput(cat.subcategories.join(', '));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    setBusy(true);
    try {
      const subs = catSubInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await adminSaveCategory(firebaseUser.uid, adminEmail, {
        ...editingCat,
        subcategories: subs.length ? subs : ['General'],
      });
      setFeedback(`Saved category "${editingCat.name_en}".`);
      setEditingCat(null);
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save category.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminSaveSettings(firebaseUser.uid, adminEmail, settings);
      setFeedback('Global platform settings saved.');
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-5 sm:py-8 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-5 sm:space-y-6">
        {/* Top Admin Header Bar */}
        <div className="bg-[#142B4A] text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-xl font-bold">MYSERVICE Admin Operations Console</h1>
              <p className="text-xs text-slate-300 break-all sm:break-normal">Signed in as {adminEmail} · Audit logging enabled</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || loading}
              onClick={loadAll}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSyncCatalog}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-xs font-semibold"
            >
              <Database className="w-3.5 h-3.5" /> Sync Default Catalog
            </button>
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-xs underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Responsive Admin Nav: Horizontal Scroll Tabs on Mobile, Sidebar on Desktop */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-2 sm:p-3">
            <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 lg:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors text-left ${
                      active ? 'bg-[#EAF2FF] text-[#2563EB] font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="font-mono text-xs font-bold text-[#2563EB] tabular-nums">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Admin Workspace */}
          <div className="lg:col-span-9 space-y-6">
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Users', value: metrics.totalUsers },
                    { label: 'Providers', value: metrics.totalProviders },
                    { label: 'Pending Approvals', value: metrics.pendingProviders, highlight: metrics.pendingProviders > 0 },
                    { label: 'Listings', value: metrics.totalListings },
                    { label: 'Active Jobs', value: metrics.activeJobs },
                    { label: 'Total Bookings', value: metrics.totalBookings },
                    { label: 'Completed Jobs', value: metrics.completedBookings },
                    { label: 'Active Subs', value: metrics.activeSubscriptions },
                    { label: 'Open Reports/Disputes', value: metrics.safetyCount, highlight: metrics.safetyCount > 0 },
                    { label: 'Commission LKR', value: `LKR ${metrics.totalCommission.toLocaleString()}` },
                  ].map((m, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs text-slate-500">{m.label}</p>
                      <p
                        className={`font-mono text-xl font-bold mt-1 tabular-nums ${
                          m.highlight ? 'text-[#2563EB]' : 'text-[#142B4A]'
                        }`}
                      >
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                  <h2 className="font-bold text-[#142B4A]">Initial Firestore Seed & Operations Checklist</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Click <strong>Sync Default Catalog</strong> in the top bar once after deployment to write the 15 trilingual Sri Lankan categories, 3 provider subscription plans (Free / Pro / Business), and public commission settings directly into Firestore.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('verification')}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                    >
                      Review Pending Providers ({metrics.pendingProviders})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('categories')}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A]"
                    >
                      Manage 15 Categories
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. USER MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#142B4A]">Registered Users ({data.users.length})</h2>
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, district, or UID..."
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-64"
                  />
                </div>

                {/* Mobile User Cards */}
                <div className="md:hidden space-y-3">
                  {filteredUsers.map((u) => (
                    <div key={u.uid} className="rounded-xl border border-slate-200 bg-[#F5F8FD]/40 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[#142B4A] truncate">{u.displayName}</p>
                          <p className="font-mono text-[11px] text-slate-400 truncate">{u.uid}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            u.accountStatus === 'active' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {u.accountStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                        <span>
                          {u.city ? `${u.city}, ` : ''}{u.district || 'Western'} · <span className="capitalize">{u.providerStatus.replace('_', ' ')}</span>
                        </span>
                        {u.uid !== firebaseUser.uid && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmUserAction({
                                user: u,
                                status: u.accountStatus === 'active' ? 'suspended' : 'active',
                              })
                            }
                            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              u.accountStatus === 'active'
                                ? 'border border-red-200 text-red-600 hover:bg-red-50'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Location</th>
                        <th className="py-2 pr-4">Provider Mode</th>
                        <th className="py-2 pr-4">Account Status</th>
                        <th className="py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.uid}>
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-[#142B4A]">{u.displayName}</p>
                            <p className="font-mono text-[11px] text-slate-400">{u.uid}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {u.city ? `${u.city}, ` : ''}{u.district || 'Western'}
                          </td>
                          <td className="py-3 pr-4 text-xs capitalize text-slate-700">
                            {u.providerStatus.replace('_', ' ')}
                          </td>
                          <td className="py-3 pr-4 text-xs font-semibold">
                            <span className={u.accountStatus === 'active' ? 'text-emerald-700' : 'text-red-600'}>
                              {u.accountStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {u.uid !== firebaseUser.uid && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmUserAction({
                                    user: u,
                                    status: u.accountStatus === 'active' ? 'suspended' : 'active',
                                  })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  u.accountStatus === 'active'
                                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PROVIDER VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Provider Verification Queue ({data.providers.length})
                </h2>

                {data.providers.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No provider registrations yet.
                  </div>
                ) : (
                  data.providers.map((prov) => {
                    const verif = data.verifications.find((v) => v.providerId === prov.id);
                    return (
                      <div key={prov.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                              <span
                                className={
                                  prov.verificationStatus === 'verified'
                                    ? 'text-emerald-700'
                                    : prov.verificationStatus === 'pending_review'
                                    ? 'text-amber-700'
                                    : 'text-red-600'
                                }
                              >
                                Status: {prov.verificationStatus.replace('_', ' ')}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500">{prov.city}, {prov.district}</span>
                            </div>
                            <h3 className="font-bold text-[#142B4A]">{prov.businessName || prov.fullName}</h3>
                            <p className="text-xs text-slate-600">{prov.qualifications || 'No qualifications listed'}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewTarget({ provider: prov, verif });
                                setReviewDecision('verified');
                                setReviewNotes(verif?.reviewNotes || '');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                            >
                              Review Credentials
                            </button>
                          </div>
                        </div>

                        {verif && (
                          <div className="p-3.5 rounded-xl bg-[#F5F8FD] border border-blue-100 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <p><strong>NIC / BR Reg:</strong> {verif.nicOrRegNumber}</p>
                            <p><strong>Phone:</strong> {verif.phone}</p>
                            <p><strong>Email:</strong> {verif.email}</p>
                            <p><strong>Docs:</strong> {(verif.documentNames || []).join(', ') || 'None uploaded'}</p>
                            {verif.certificateSummary && (
                              <p className="sm:col-span-2"><strong>Summary:</strong> {verif.certificateSummary}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 4. CATEGORY MANAGEMENT */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#142B4A]">Service Categories ({categories.length})</h2>
                    <p className="text-xs text-slate-500">Add, edit, reorder, hide, or flag specialist verification requirements.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleSyncCatalog}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#142B4A]"
                    >
                      Sync Default 15
                    </button>
                    <button
                      type="button"
                      onClick={openNewCategory}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Category
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                          <span className="font-mono text-slate-400">#{cat.sortOrder}</span>
                          <span className={cat.isActive ? 'text-emerald-700' : 'text-slate-400'}>
                            {cat.isActive ? 'Visible' : 'Hidden'}
                          </span>
                          {cat.requiresSpecialistVerification && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-700">Specialist Verification Required</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-[#142B4A]">
                          {cat.name_en} / {cat.name_si} / {cat.name_ta}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{cat.subcategories.join(' · ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCategory(cat)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#142B4A] inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(cat)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. MARKETPLACE & SAFETY MANAGEMENT */}
            {activeTab === 'marketplace' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'listings', label: `Listings (${data.listings.length})` },
                    { id: 'jobs', label: `Jobs (${data.jobs.length})` },
                    { id: 'bookings', label: `Bookings (${data.bookings.length})` },
                    { id: 'safety', label: `Reports & Disputes (${data.reports.length + data.disputes.length})` },
                    { id: 'inbox', label: `Contact Inbox (${data.contactMessages.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMarketSubTab(tab.id as typeof marketSubTab)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                        marketSubTab === tab.id
                          ? 'bg-[#EAF2FF] border-[#2563EB] text-[#2563EB]'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {marketSubTab === 'listings' && (
                  <div className="space-y-3">
                    {data.listings.map((l) => (
                      <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-[#142B4A]">{l.title}</p>
                          <p className="text-xs text-slate-500">
                            {l.providerName} · {l.district} · LKR {l.priceLkr.toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await adminToggleListingFeatured(firebaseUser.uid, adminEmail, l, !l.isFeatured);
                            setFeedback(`${l.title} featured status -> ${!l.isFeatured}`);
                            await loadAll();
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                            l.isFeatured ? 'bg-[#2563EB] text-white' : 'border border-slate-200 text-[#142B4A]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {l.isFeatured ? 'Featured (Click to Remove)' : 'Feature Listing'}
                        </button>
                      </div>
                    ))}
                    {data.listings.length === 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
                        No Firestore service listings yet (Western Province Sample Demo cards are shown publicly until real providers publish).
                      </div>
                    )}
                  </div>
                )}

                {marketSubTab === 'jobs' && (
                  <div className="space-y-3">
                    {data.jobs.map((j) => (
                      <div key={j.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className="flex justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#2563EB] capitalize">{j.status}</span>
                          <span>{j.city}, {j.district} · {j.preferredDate}</span>
                        </div>
                        <p className="font-bold text-sm text-[#142B4A] mt-1">{j.title}</p>
                        <p className="text-xs text-slate-600 mt-1">Customer: {j.customerName} · Quotations: {j.quotationCount || 0}</p>
                      </div>
                    ))}
                  </div>
                )}

                {marketSubTab === 'bookings' && (
                  <div className="space-y-3">
                    {data.bookings.map((b) => (
                      <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-[#142B4A]">{b.serviceTitle}</p>
                          <p className="text-xs text-slate-500">
                            {b.customerName} &rarr; {b.providerName} · {b.scheduledDate} · Status: {b.status}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold text-[#142B4A]">
                          LKR {b.amountLkr.toLocaleString()} ({b.paymentStatus})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {marketSubTab === 'safety' && (
                  <div className="space-y-4">
                    {data.reports.map((rep) => (
                      <div key={rep.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Report ({rep.targetType})
                          </span>
                          <span className="capitalize font-semibold">{rep.status}</span>
                        </div>
                        <p className="text-sm text-[#142B4A]">{rep.reason}</p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Resolution note..."
                            value={resolutionNotes[rep.id] ?? rep.resolutionNote ?? ''}
                            onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))}
                            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateReportOrDispute({
                                adminUid: firebaseUser.uid,
                                adminEmail,
                                collectionName: 'reports',
                                docId: rep.id,
                                existingData: rep as unknown as Record<string, unknown>,
                                status: 'resolved',
                                resolutionNote: resolutionNotes[rep.id] || 'Resolved by admin',
                              });
                              await loadAll();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                    {data.disputes.map((dsp) => (
                      <div key={dsp.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-red-600">Booking Dispute ({dsp.bookingId})</span>
                          <span className="capitalize font-semibold">{dsp.status}</span>
                        </div>
                        <p className="text-sm text-[#142B4A]">{dsp.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Dispute resolution note..."
                            value={resolutionNotes[dsp.id] ?? dsp.resolutionNote ?? ''}
                            onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [dsp.id]: e.target.value }))}
                            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateReportOrDispute({
                                adminUid: firebaseUser.uid,
                                adminEmail,
                                collectionName: 'disputes',
                                docId: dsp.id,
                                existingData: dsp as unknown as Record<string, unknown>,
                                status: 'resolved_closed',
                                resolutionNote: resolutionNotes[dsp.id] || 'Closed by admin',
                              });
                              await loadAll();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                          >
                            Close Dispute
                          </button>
                        </div>
                      </div>
                    ))}
                    {data.reports.length + data.disputes.length === 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
                        No open reports or disputes.
                      </div>
                    )}
                  </div>
                )}

                {marketSubTab === 'inbox' && (
                  <div className="space-y-3">
                    {data.contactMessages.map((m) => (
                      <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[#2563EB] inline-flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> {m.name} ({m.email})
                          </span>
                        </div>
                        <p className="font-bold text-sm text-[#142B4A]">{m.subject}</p>
                        <p className="text-sm text-slate-600">{m.message}</p>
                      </div>
                    ))}
                    {data.contactMessages.length === 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
                        No contact messages submitted yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. FINANCIAL MANAGEMENT */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-bold text-[#142B4A]">Platform Commission Rate (%)</h2>
                    <p className="text-xs text-slate-500">Applied automatically when new bookings & quotation acceptances are created.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={settings.defaultCommissionPct}
                      onChange={(e) => setSettings({ ...settings, defaultCommissionPct: Number(e.target.value) })}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                    >
                      Save Commission %
                    </button>
                  </div>
                </form>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-bold text-[#142B4A]">Subscription Plans</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#142B4A]">{plan.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlan({ ...plan });
                              setPlanFeaturesText(plan.features.join('\n'));
                            }}
                            className="text-xs font-semibold text-[#2563EB]"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="font-mono text-sm font-bold">
                          LKR {plan.monthlyPriceLkr.toLocaleString()}/mo · {plan.listingLimit} listings
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-bold text-[#142B4A]">Payment Records & Sandbox Refunds ({data.payments.length})</h2>
                  {data.payments.length === 0 ? (
                    <p className="text-sm text-slate-500">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.payments.map((pay) => (
                        <div key={pay.id} className="p-4 rounded-xl border border-slate-100 bg-[#F5F8FD] flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-bold text-[#142B4A]">
                              {pay.paymentType} · {pay.transactionRef}
                            </p>
                            <p className="text-slate-500">
                              LKR {pay.amountLkr.toLocaleString()} · {pay.gatewayMode} · Status: {pay.status}
                            </p>
                          </div>
                          {pay.status !== 'refunded' && (
                            <button
                              type="button"
                              onClick={() => setConfirmRefundPayment(pay)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50"
                            >
                              Process Demo Refund
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. CONTENT MANAGEMENT */}
            {activeTab === 'content' && (
              <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Trilingual Announcements & Support Contact</h2>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Announcement (English)</label>
                  <input
                    type="text"
                    value={settings.announcement_en || ''}
                    onChange={(e) => setSettings({ ...settings, announcement_en: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Announcement (Sinhala)</label>
                  <input
                    type="text"
                    value={settings.announcement_si || ''}
                    onChange={(e) => setSettings({ ...settings, announcement_si: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Announcement (Tamil)</label>
                  <input
                    type="text"
                    value={settings.announcement_ta || ''}
                    onChange={(e) => setSettings({ ...settings, announcement_ta: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">Support Email</label>
                    <input
                      type="email"
                      value={settings.supportEmail || ''}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">Support Phone</label>
                    <input
                      type="text"
                      value={settings.supportPhone || ''}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
                >
                  {busy ? 'Saving...' : 'Publish Content Settings'}
                </button>
              </form>
            )}

            {/* 8. REPORTS & AUDIT LOGS */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-[#142B4A]">Marketplace Performance Breakdown</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-[#F5F8FD] border border-blue-100">
                      <p className="text-xs text-slate-500">Verification Rate</p>
                      <p className="font-mono text-xl font-bold text-[#142B4A] mt-1">
                        {data.providers.length
                          ? `${Math.round((data.providers.filter((p) => p.verificationStatus === 'verified').length / data.providers.length) * 100)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F8FD] border border-blue-100">
                      <p className="text-xs text-slate-500">Booking Completion Rate</p>
                      <p className="font-mono text-xl font-bold text-[#142B4A] mt-1">
                        {data.bookings.length
                          ? `${Math.round((metrics.completedBookings / data.bookings.length) * 100)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F8FD] border border-blue-100">
                      <p className="text-xs text-slate-500">Total Sandbox Revenue Tracked</p>
                      <p className="font-mono text-xl font-bold text-emerald-700 mt-1">
                        LKR {data.payments.reduce((a, p) => a + (p.amountLkr || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#2563EB]" />
                    <h2 className="text-lg font-bold text-[#142B4A]">Immutable Admin Audit Logs ({data.auditLogs.length})</h2>
                  </div>
                  {data.auditLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">No admin audit logs recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.auditLogs.map((log) => (
                        <div key={log.id} className="p-3.5 rounded-xl border border-slate-100 bg-[#F5F8FD] text-xs">
                          <div className="flex flex-wrap justify-between gap-2 font-semibold text-[#142B4A]">
                            <span>{log.action}</span>
                            <span className="font-mono text-slate-500">{log.targetPath}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{log.details} · by {log.actorEmail || log.actorUid}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm User Status Toggle */}
      <ConfirmDialog
        open={Boolean(confirmUserAction)}
        title={confirmUserAction?.status === 'suspended' ? 'Suspend User Account?' : 'Reactivate User Account?'}
        description={`Change account status for ${confirmUserAction?.user.displayName} to "${confirmUserAction?.status}"?`}
        confirmLabel={confirmUserAction?.status === 'suspended' ? 'Suspend User' : 'Reactivate User'}
        destructive={confirmUserAction?.status === 'suspended'}
        onCancel={() => setConfirmUserAction(null)}
        onConfirm={async () => {
          if (!confirmUserAction) return;
          await adminToggleUserAccountStatus(firebaseUser.uid, adminEmail, confirmUserAction.user, confirmUserAction.status);
          setFeedback(`User ${confirmUserAction.user.displayName} is now ${confirmUserAction.status}.`);
          setConfirmUserAction(null);
          await loadAll();
        }}
      />

      {/* Provider Verification Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleReviewSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-[#142B4A]">
              Verify Provider: {reviewTarget.provider.businessName || reviewTarget.provider.fullName}
            </h3>
            {reviewTarget.verif ? (
              <div className="p-3.5 rounded-xl bg-[#F5F8FD] text-xs space-y-1 text-slate-700">
                <p><strong>NIC / Reg:</strong> {reviewTarget.verif.nicOrRegNumber}</p>
                <p><strong>Phone:</strong> {reviewTarget.verif.phone} · <strong>Email:</strong> {reviewTarget.verif.email}</p>
                <p><strong>Documents:</strong> {(reviewTarget.verif.documentNames || []).join(', ') || 'None'}</p>
              </div>
            ) : (
              <p className="text-xs text-amber-700">No verification document record submitted yet.</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1">Decision</label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value as VerificationStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="verified">Approve & Grant Verified Badge</option>
                <option value="rejected">Reject (Requires Corrections)</option>
                <option value="suspended">Suspend Provider</option>
                <option value="pending_review">Keep Pending Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1">Review Notes (Visible to provider if rejected)</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Reason or verification confirmation note..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                {busy ? 'Updating...' : 'Save Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <form onSubmit={handleSaveCategory} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-3.5 shadow-xl my-8">
            <h3 className="font-bold text-lg text-[#142B4A]">Save Service Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1">Name (English) *</label>
                <input
                  type="text"
                  required
                  value={editingCat.name_en}
                  onChange={(e) => setEditingCat({ ...editingCat, name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  value={editingCat.slug}
                  onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1">Name (Sinhala) *</label>
                <input
                  type="text"
                  required
                  value={editingCat.name_si}
                  onChange={(e) => setEditingCat({ ...editingCat, name_si: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B4A] mb-1">Name (Tamil) *</label>
                <input
                  type="text"
                  required
                  value={editingCat.name_ta}
                  onChange={(e) => setEditingCat({ ...editingCat, name_ta: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1">Subcategories (comma-separated)</label>
              <input
                type="text"
                value={catSubInput}
                onChange={(e) => setCatSubInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 items-center text-xs">
              <div>
                <label className="block font-semibold text-[#142B4A] mb-1">Sort Order</label>
                <input
                  type="number"
                  min={1}
                  value={editingCat.sortOrder}
                  onChange={(e) => setEditingCat({ ...editingCat, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 font-medium text-[#142B4A] pt-4">
                <input
                  type="checkbox"
                  checked={editingCat.isActive}
                  onChange={(e) => setEditingCat({ ...editingCat, isActive: e.target.checked })}
                />
                Visible
              </label>
              <label className="flex items-center gap-2 font-medium text-[#142B4A] pt-4">
                <input
                  type="checkbox"
                  checked={Boolean(editingCat.requiresSpecialistVerification)}
                  onChange={(e) => setEditingCat({ ...editingCat, requiresSpecialistVerification: e.target.checked })}
                />
                Specialist Verification
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Category */}
      <ConfirmDialog
        open={Boolean(confirmDeleteCat)}
        title="Delete Category?"
        description={`Delete "${confirmDeleteCat?.name_en}" from the Firestore category catalog?`}
        confirmLabel="Delete Category"
        destructive
        onCancel={() => setConfirmDeleteCat(null)}
        onConfirm={async () => {
          if (!confirmDeleteCat) return;
          await adminDeleteCategory(firebaseUser.uid, adminEmail, confirmDeleteCat.id);
          setFeedback(`Deleted category "${confirmDeleteCat.name_en}".`);
          setConfirmDeleteCat(null);
          await loadAll();
        }}
      />

      {/* Plan Editor Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await adminSaveSubscriptionPlan(firebaseUser.uid, adminEmail, {
                ...editingPlan,
                features: planFeaturesText.split('\n').map((s) => s.trim()).filter(Boolean),
              });
              setFeedback(`Saved subscription plan "${editingPlan.name}".`);
              setEditingPlan(null);
              await loadAll();
            }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-lg text-[#142B4A]">Edit Plan: {editingPlan.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Monthly (LKR)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.monthlyPriceLkr}
                  onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPriceLkr: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Yearly (LKR)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.yearlyPriceLkr}
                  onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPriceLkr: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Listing Limit</label>
              <input
                type="number"
                min={1}
                value={editingPlan.listingLimit}
                onChange={(e) => setEditingPlan({ ...editingPlan, listingLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Features (one per line)</label>
              <textarea
                rows={4}
                value={planFeaturesText}
                onChange={(e) => setPlanFeaturesText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold">
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Demo Refund */}
      <ConfirmDialog
        open={Boolean(confirmRefundPayment)}
        title="Process Sandbox Refund?"
        description={`Mark payment ${confirmRefundPayment?.transactionRef} (LKR ${confirmRefundPayment?.amountLkr.toLocaleString()}) as refunded?`}
        confirmLabel="Refund Payment"
        destructive
        onCancel={() => setConfirmRefundPayment(null)}
        onConfirm={async () => {
          if (!confirmRefundPayment) return;
          await adminProcessPaymentRefund(firebaseUser.uid, adminEmail, confirmRefundPayment);
          setFeedback(`Processed sandbox refund for ${confirmRefundPayment.transactionRef}.`);
          setConfirmRefundPayment(null);
          await loadAll();
        }}
      />
    </div>
  );
};
