import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Bell,
  Bookmark,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  Star,
  User,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MessagesPanel } from '../components/MessagesPanel';
import { ModeSwitcherBanner } from '../components/ModeSwitcherBanner';
import { usePageMeta } from '../components/PageMeta';
import { PayHereDemoModal } from '../components/PayHereDemoModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getDistrictLabel, getProvinceLabel, SRI_LANKA_PROVINCES } from '../data/sriLankaLocations';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  acceptQuotation,
  fetchPublicAdminSettings,
  getOrCreateConversation,
  markNotificationRead,
  recordVerifiedSandboxPayment,
  rejectQuotation,
  SavedProvider,
  submitBookingReview,
  submitReportOrDispute,
  toggleSavedProvider,
  updateBookingStatus,
  updateJobRequest,
  updateUserProfileAndContact,
} from '../lib/marketplaceService';
import {
  Booking,
  JobRequest,
  LanguageCode,
  NotificationItem,
  Quotation,
  ReviewItem,
} from '../types/marketplace';

type CustomerTab =
  | 'overview'
  | 'jobs'
  | 'quotations'
  | 'bookings'
  | 'messages'
  | 'saved'
  | 'notifications'
  | 'reviews'
  | 'profile'
  | 'settings';

export const CustomerDashboard: React.FC = () => {
  const { firebaseUser, userProfile, privateContact, providerProfile, authReady, setWorkspaceMode, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  usePageMeta('Customer Dashboard', 'Manage your job requests, quotations, bookings, messages, and profile on MYSERVICE.');

  const initialTab = (searchParams.get('tab') as CustomerTab) || 'overview';
  const [activeTab, setActiveTab] = useState<CustomerTab>(initialTab);

  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewItem[]>([]);

  const [feedback, setFeedback] = useState<string | null>(
    searchParams.get('posted') === '1' ? 'Job request published! Matching providers are being notified.' : null
  );
  const [confirmCancelJob, setConfirmCancelJob] = useState<JobRequest | null>(null);
  const [confirmRejectQuote, setConfirmRejectQuote] = useState<Quotation | null>(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState<Booking | null>(null);
  const [payBooking, setPayBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [disputeText, setDisputeText] = useState('');

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [prefLang, setPrefLang] = useState<LanguageCode>('en');
  const [province, setProvince] = useState('Western');
  const [district, setDistrict] = useState('Colombo');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [privateAddress, setPrivateAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setWorkspaceMode('customer');
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as CustomerTab | null;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setPrefLang(userProfile.preferredLanguage);
      setProvince(userProfile.province || 'Western');
      setDistrict(userProfile.district || 'Colombo');
      setCity(userProfile.city || '');
    }
    if (privateContact) {
      setPhone(privateContact.phone || '');
      setPrivateAddress(privateContact.privateAddress || '');
    }
  }, [userProfile, privateContact]);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubs = [
      onSnapshot(
        query(collection(db, 'jobRequests'), where('customerId', '==', uid)),
        (snap) => setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobRequest, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'jobRequests')
      ),
      onSnapshot(
        query(collection(db, 'quotations'), where('customerId', '==', uid)),
        (snap) => setQuotations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quotation, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
      ),
      onSnapshot(
        query(collection(db, 'bookings'), where('customerId', '==', uid)),
        (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
      ),
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      ),
      onSnapshot(
        query(collection(db, 'savedProviders'), where('customerId', '==', uid)),
        (snap) => setSavedProviders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedProvider, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'savedProviders')
      ),
      onSnapshot(
        query(collection(db, 'reviews'), where('customerId', '==', uid)),
        (snap) => setMyReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewItem, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, firebaseUser]);

  if (!authReady) {
    return <div className="p-12 text-center text-sm text-slate-500">{t('loadingText')}</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-[70vh] bg-[#F5F8FD] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-[#142B4A]">Sign in to view your Customer Dashboard</h1>
          <p className="text-sm text-slate-600">Manage job requests, quotations, bookings, and private messages.</p>
          <Link to="/login" className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
            {t('navSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const navItems: { id: CustomerTab | 'find' | 'post'; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'find', label: '2. Find Services', icon: Search },
    { id: 'post', label: '3. Post a Job', icon: PlusCircle },
    { id: 'jobs', label: '4. My Job Requests', icon: ClipboardList, count: jobs.length },
    { id: 'quotations', label: '5. Received Quotations', icon: FileText, count: quotations.filter((q) => q.status === 'pending').length },
    { id: 'bookings', label: '6. My Bookings', icon: CalendarCheck, count: bookings.length },
    { id: 'messages', label: '7. Messages', icon: MessageSquare },
    { id: 'saved', label: '8. Saved Providers', icon: Bookmark, count: savedProviders.length },
    { id: 'notifications', label: '9. Notifications', icon: Bell, count: unreadNotifCount },
    { id: 'reviews', label: '10. Reviews', icon: Star, count: myReviews.length },
    { id: 'profile', label: '11. My Profile', icon: User },
    { id: 'settings', label: '12. Account Settings', icon: Settings },
  ];

  const handleNavClick = (id: CustomerTab | 'find' | 'post') => {
    if (id === 'find') {
      navigate('/services');
      return;
    }
    if (id === 'post') {
      navigate('/post-job');
      return;
    }
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  const handleAcceptQuote = async (q: Quotation) => {
    const job = jobs.find((j) => j.id === q.jobId);
    if (!job) return;
    const settings = await fetchPublicAdminSettings();
    await acceptQuotation(
      q,
      job,
      userProfile?.displayName || firebaseUser.displayName || 'Customer',
      settings.defaultCommissionPct
    );
    setFeedback(`Accepted quotation from ${q.providerName}. Booking confirmed and private address shared.`);
    setActiveTab('bookings');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSavingProfile(true);
    try {
      await updateUserProfileAndContact(userProfile, {
        displayName,
        preferredLanguage: prefLang,
        province,
        district,
        city,
        email: firebaseUser.email || '',
        phone,
        privateAddress,
      });
      setLang(prefLang);
      setFeedback('Profile and private contact details saved.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking || reviewComment.trim().length < 4) return;
    await submitBookingReview({
      booking: reviewBooking,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    setReviewBooking(null);
    setReviewComment('');
    setFeedback('Thank you! Your verified booking review has been published.');
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen pb-24 md:pb-14">
      <ModeSwitcherBanner />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {feedback && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {feedback}
            </span>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs font-semibold underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Responsive Navigation: Horizontal Scroll Strip on Mobile, Sidebar on Desktop */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-2 sm:p-3">
            <div className="hidden lg:block px-3 py-2 border-b border-slate-100 mb-2">
              <p className="text-xs font-semibold text-[#2563EB]">{t('customerMode')}</p>
              <p className="font-bold text-sm text-[#142B4A] truncate">
                {userProfile?.displayName || firebaseUser.displayName}
              </p>
            </div>
            <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 lg:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      active ? 'bg-[#EAF2FF] text-[#2563EB] font-semibold' : 'text-slate-600 hover:bg-[#F5F8FD]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="font-mono text-[11px] tabular-nums">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Workspace */}
          <main className="lg:col-span-9 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-[#142B4A]">
                      Customer Overview
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Track your service requests, compare quotations, and manage bookings in one place.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/post-job" className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold">
                      {t('navPostJob')}
                    </Link>
                    <Link to="/services" className="px-4 py-2.5 rounded-xl border border-slate-200 text-[#142B4A] text-xs font-semibold">
                      {t('navFindServices')}
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 mb-1">Job Requests</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] tabular-nums">{jobs.length}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 mb-1">Pending Quotations</p>
                    <p className="font-mono text-2xl font-bold text-[#2563EB] tabular-nums">
                      {quotations.filter((q) => q.status === 'pending').length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 mb-1">Bookings</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] tabular-nums">{bookings.length}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 mb-1">Unread Alerts</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] tabular-nums">{unreadNotifCount}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#142B4A]">My Job Requests</h2>
                  <Link to="/post-job" className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold">
                    + Post New Job
                  </Link>
                </div>
                {jobs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6">No job requests posted yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {jobs.map((job) => (
                      <div key={job.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">
                            {job.subcategory} · {job.city}, {job.district} · Preferred {job.preferredDate}
                          </p>
                          <h3 className="font-semibold text-[#142B4A]">{job.title}</h3>
                          <p className="text-xs text-slate-600 line-clamp-2">{job.description}</p>
                          {job.photoThumbnails && job.photoThumbnails.length > 0 && (
                            <div className="flex items-center gap-2 pt-1.5">
                              {job.photoThumbnails.map((src, idx) => (
                                <img
                                  key={idx}
                                  src={src}
                                  alt={job.photoCaptions?.[idx] || `Job photo ${idx + 1}`}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-[#2563EB]">
                            {t(`status_${job.status}`)}
                          </span>
                          {(job.status === 'open' || job.status === 'quoted') && (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelJob(job)}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-red-600 hover:bg-red-50"
                            >
                              Cancel Job
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quotations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Received Quotations</h2>
                {quotations.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6">
                    No quotations received yet. Post a job request so matching providers can quote.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {quotations.map((q) => (
                      <div key={q.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            For: {q.jobTitle} · Est. {q.estimatedDuration} · Status: {q.status}
                          </p>
                          <h3 className="font-bold text-[#142B4A] mt-0.5">
                            {q.providerName}{' '}
                            {q.providerVerified ? <span className="text-emerald-700 text-xs">· Verified</span> : null}
                          </h3>
                          {q.notes && <p className="text-sm text-slate-600 mt-1">{q.notes}</p>}
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <span className="font-mono text-lg font-bold text-[#142B4A] tabular-nums">
                            LKR {q.amountLkr.toLocaleString()}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await getOrCreateConversation({
                                  customerId: firebaseUser.uid,
                                  customerName: userProfile?.displayName || 'Customer',
                                  providerId: q.providerId,
                                  providerName: q.providerName,
                                  contextTitle: q.jobTitle,
                                });
                                setActiveTab('messages');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                            >
                              Chat
                            </button>
                            {q.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRejectQuote(q)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-red-600"
                                >
                                  {t('rejectQuotation')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptQuote(q)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                                >
                                  {t('acceptQuotation')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">My Bookings</h2>
                {bookings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6">No bookings yet.</p>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((bk) => (
                      <div key={bk.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            {bk.providerName} · {bk.city}, {bk.district} · {bk.scheduledDate}
                          </p>
                          <h3 className="font-bold text-[#142B4A]">{bk.serviceTitle}</h3>
                          <p className="text-xs text-slate-600 mt-1">
                            Booking: <span className="font-semibold text-[#2563EB]">{t(`status_${bk.status}`)}</span> · Payment:{' '}
                            <span className="font-semibold">{bk.paymentStatus.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <span className="font-mono text-base font-bold text-[#142B4A] tabular-nums">
                            LKR {bk.amountLkr.toLocaleString()}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {bk.paymentStatus === 'unpaid' && bk.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => setPayBooking(bk)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                {t('paySandboxDemo')}
                              </button>
                            )}
                            {bk.status === 'completed' && !bk.reviewSubmitted && (
                              <button
                                type="button"
                                onClick={() => setReviewBooking(bk)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                              >
                                Leave Review
                              </button>
                            )}
                            {(bk.status === 'pending_confirmation' || bk.status === 'confirmed') && (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelBooking(bk)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-red-600"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDisputeBooking(bk)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
                            >
                              Report Issue
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <MessagesPanel
                uid={firebaseUser.uid}
                userName={userProfile?.displayName || firebaseUser.displayName || 'Customer'}
                role="customer"
              />
            )}

            {activeTab === 'saved' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Saved Providers</h2>
                {savedProviders.length === 0 ? (
                  <p className="text-sm text-slate-500">No saved providers yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {savedProviders.map((sp) => (
                      <div key={sp.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <Link to={`/providers/${sp.providerId}`} className="font-semibold text-[#142B4A] hover:text-[#2563EB]">
                            {sp.providerName}
                          </Link>
                          {sp.district && <p className="text-xs text-slate-500">{sp.district}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            toggleSavedProvider({
                              customerId: firebaseUser.uid,
                              providerId: sp.providerId,
                              providerName: sp.providerName,
                              currentlySavedId: sp.id,
                            })
                          }
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Notifications</h2>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No notifications yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-600' : 'text-[#142B4A]'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n)}
                            className="text-xs font-semibold text-[#2563EB] whitespace-nowrap"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">My Submitted Reviews</h2>
                {myReviews.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    You can leave a review once a booking is marked completed.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myReviews.map((rev) => (
                      <div key={rev.id} className="border border-slate-200 rounded-xl p-4">
                        <p className="font-mono text-xs font-bold text-amber-600 mb-1">{rev.rating}/5 ★</p>
                        <p className="text-sm text-[#142B4A]">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">My Profile & Private Contact Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Language</label>
                    <select
                      value={prefLang}
                      onChange={(e) => setPrefLang(e.target.value as LanguageCode)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="en">English</option>
                      <option value="si">සිංහල (Sinhala)</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Province</label>
                    <select
                      value={province}
                      onChange={(e) => {
                        const p = SRI_LANKA_PROVINCES.find((x) => x.id === e.target.value) || SRI_LANKA_PROVINCES[0];
                        setProvince(p.id);
                        setDistrict(p.districts[0].id);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {SRI_LANKA_PROVINCES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {getProvinceLabel(p.id, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {(SRI_LANKA_PROVINCES.find((p) => p.id === province)?.districts || []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDistrictLabel(d.id, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">City / Area</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Private Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Private Home Address</label>
                    <input
                      type="text"
                      value={privateAddress}
                      onChange={(e) => setPrivateAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Account Settings</h2>
                <p className="text-sm text-slate-600">
                  Signed in as <span className="font-semibold text-[#142B4A]">{firebaseUser.email}</span>.
                </p>
                <div className="p-4 rounded-xl bg-[#F5F8FD] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-[#142B4A] flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#2563EB]" />
                      Provider Mode Status: {t(`status_${userProfile?.providerStatus || 'not_submitted'}`)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Use the same account to advertise services or hire other professionals.
                    </p>
                  </div>
                  <Link
                    to={providerProfile ? '/provider-dashboard' : '/become-provider'}
                    className="px-4 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-semibold whitespace-nowrap"
                  >
                    {providerProfile ? 'Open Provider Dashboard' : 'Activate Provider Mode'}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                >
                  {t('navSignOut')}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={Boolean(confirmCancelJob)}
        title="Cancel Job Request?"
        description={`Are you sure you want to cancel "${confirmCancelJob?.title}"? Providers will no longer be able to quote.`}
        confirmLabel="Cancel Job"
        destructive
        onCancel={() => setConfirmCancelJob(null)}
        onConfirm={async () => {
          if (!confirmCancelJob) return;
          await updateJobRequest(confirmCancelJob, { status: 'cancelled' });
          setConfirmCancelJob(null);
          setFeedback('Job request cancelled.');
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmRejectQuote)}
        title="Reject Quotation?"
        description={`Reject the LKR ${confirmRejectQuote?.amountLkr.toLocaleString()} quotation from ${confirmRejectQuote?.providerName}?`}
        confirmLabel="Reject Quotation"
        destructive
        onCancel={() => setConfirmRejectQuote(null)}
        onConfirm={async () => {
          if (!confirmRejectQuote) return;
          await rejectQuotation(confirmRejectQuote);
          setConfirmRejectQuote(null);
          setFeedback('Quotation rejected.');
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmCancelBooking)}
        title="Cancel Booking?"
        description={`Cancel booking "${confirmCancelBooking?.serviceTitle}"? The provider will be notified immediately.`}
        confirmLabel="Confirm Cancellation"
        destructive
        onCancel={() => setConfirmCancelBooking(null)}
        onConfirm={async () => {
          if (!confirmCancelBooking) return;
          await updateBookingStatus(confirmCancelBooking, 'cancelled');
          setConfirmCancelBooking(null);
          setFeedback('Booking cancelled.');
        }}
      />

      {/* PayHere Sandbox Demo Modal */}
      {payBooking && (
        <PayHereDemoModal
          open={Boolean(payBooking)}
          uid={firebaseUser.uid}
          paymentType="booking"
          referenceId={payBooking.id}
          amountLkr={payBooking.amountLkr}
          itemTitle={`Booking: ${payBooking.serviceTitle}`}
          onClose={() => setPayBooking(null)}
          onVerified={async ({ transactionRef, gatewayMode }) => {
            await recordVerifiedSandboxPayment({
              uid: firebaseUser.uid,
              paymentType: 'booking',
              referenceId: payBooking.id,
              amountLkr: payBooking.amountLkr,
              transactionRef,
              gatewayMode,
              booking: payBooking,
            });
            setFeedback(`PayHere Sandbox Demo payment verified (${transactionRef}).`);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleSubmitReview} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#142B4A]">Review Completed Service</h3>
            <p className="text-xs text-slate-500">{reviewBooking.serviceTitle} · {reviewBooking.providerName}</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rating (1-5)</label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Very Good</option>
                <option value={3}>3 - Satisfactory</option>
                <option value={2}>2 - Needs Improvement</option>
                <option value={1}>1 - Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Comment *</label>
              <textarea
                required
                minLength={4}
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share how the service went..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReviewBooking(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
                Publish Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (disputeText.trim().length < 5) return;
              await submitReportOrDispute({
                kind: 'dispute',
                reporterId: firebaseUser.uid,
                targetUserId: disputeBooking.providerId,
                bookingId: disputeBooking.id,
                details: disputeText.trim(),
              });
              setDisputeBooking(null);
              setDisputeText('');
              setFeedback('Dispute opened for MYSERVICE administrator review.');
            }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[#142B4A]">Report Booking Issue</h3>
            <textarea
              required
              minLength={5}
              rows={4}
              value={disputeText}
              onChange={(e) => setDisputeText(e.target.value)}
              placeholder="Explain the issue or payment dispute..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDisputeBooking(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">
                Submit Dispute
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
