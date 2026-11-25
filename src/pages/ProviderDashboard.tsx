import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MessagesPanel } from '../components/MessagesPanel';
import { ModeSwitcherBanner } from '../components/ModeSwitcherBanner';
import { usePageMeta } from '../components/PageMeta';
import { PayHereDemoModal } from '../components/PayHereDemoModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../data/sampleCatalog';
import { getDistrictLabel, SRI_LANKA_PROVINCES } from '../data/sriLankaLocations';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  activateFreeSubscription,
  createServiceListing,
  deleteServiceListing,
  fetchActiveCategories,
  fetchJobPrivateAddress,
  fetchSubscriptionPlans,
  getOrCreateConversation,
  markNotificationRead,
  recordVerifiedSandboxPayment,
  submitQuotation,
  submitReportOrDispute,
  updateBookingStatus,
  updateServiceListing,
} from '../lib/marketplaceService';
import {
  Booking,
  CommissionRecord,
  FeaturedListing,
  JobPrivateAddress,
  JobRequest,
  LanguageCode,
  NotificationItem,
  Quotation,
  ReviewItem,
  ServiceCategory,
  ServiceListing,
  SubscriptionPlan,
  SubscriptionRecord,
} from '../types/marketplace';

type ProviderTab =
  | 'overview'
  | 'profile'
  | 'services'
  | 'add-service'
  | 'edit-service'
  | 'incoming-jobs'
  | 'send-quote'
  | 'my-quotes'
  | 'accepted-jobs'
  | 'bookings'
  | 'calendar'
  | 'messages'
  | 'reviews'
  | 'earnings'
  | 'commissions'
  | 'subscriptions'
  | 'promotions'
  | 'notifications'
  | 'settings';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const LISTING_PRESET_IMAGES = [
  { label: 'Home & Electrical Repair', url: '/src/assets/images/category_home_repair_1795584342406.jpg' },
  { label: 'Cleaning & Household Care', url: '/src/assets/images/category_cleaning_care_1795584343139.jpg' },
  { label: 'Digital, IT & Events', url: '/src/assets/images/category_digital_events_1795584343961.jpg' },
];

export const ProviderDashboard: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    providerProfile,
    authReady,
    setWorkspaceMode,
    signOut,
  } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  usePageMeta('Provider Dashboard', 'Manage your services, quotations, bookings, calendar, earnings, and subscriptions on MYSERVICE.');

  const initialTab = (searchParams.get('tab') as ProviderTab) || 'overview';
  const [activeTab, setActiveTab] = useState<ProviderTab>(initialTab);

  // Live Firestore collections
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [myListings, setMyListings] = useState<ServiceListing[]>([]);
  const [openJobs, setOpenJobs] = useState<JobRequest[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<JobRequest[]>([]);
  const [myQuotations, setMyQuotations] = useState<Quotation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [featuredPromos, setFeaturedPromos] = useState<FeaturedListing[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // UI & modal states
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add / Edit Service form
  const [editingListing, setEditingListing] = useState<ServiceListing | null>(null);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCatId, setSrvCatId] = useState(DEFAULT_CATEGORIES[0].id);
  const [srvSubcat, setSrvSubcat] = useState(DEFAULT_CATEGORIES[0].subcategories[0]);
  const [srvDesc, setSrvDesc] = useState('');
  const [srvProvince, setSrvProvince] = useState('Western');
  const [srvDistrict, setSrvDistrict] = useState('Colombo');
  const [srvCity, setSrvCity] = useState('');
  const [srvCoverage, setSrvCoverage] = useState<string[]>(['Colombo']);
  const [srvPrice, setSrvPrice] = useState('2500');
  const [srvUnit, setSrvUnit] = useState('per visit');
  const [srvImage, setSrvImage] = useState(LISTING_PRESET_IMAGES[0].url);

  // Confirm dialogs
  const [confirmDeleteListing, setConfirmDeleteListing] = useState<ServiceListing | null>(null);
  const [confirmWithdrawQuote, setConfirmWithdrawQuote] = useState<Quotation | null>(null);
  const [confirmDeclineBooking, setConfirmDeclineBooking] = useState<Booking | null>(null);

  // Quotation composer state
  const [quoteJob, setQuoteJob] = useState<JobRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('Same day / 3 hours');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [jobScopeFilter, setJobScopeFilter] = useState<'matching' | 'all'>('matching');

  // Revealed private job addresses
  const [privateAddresses, setPrivateAddresses] = useState<Record<string, JobPrivateAddress | null>>({});
  const [loadingAddressId, setLoadingAddressId] = useState<string | null>(null);

  // Profile & Calendar editing state
  const [profBusinessName, setProfBusinessName] = useState('');
  const [profBio, setProfBio] = useState('');
  const [profQualifications, setProfQualifications] = useState('');
  const [profPrice, setProfPrice] = useState('2500');
  const [profProvince, setProfProvince] = useState('Western');
  const [profDistrict, setProfDistrict] = useState('Colombo');
  const [profCity, setProfCity] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [timeSlots, setTimeSlots] = useState('08:00 AM - 06:00 PM');

  // Payments / Sandbox Demo state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [promoteListing, setPromoteListing] = useState<ServiceListing | null>(null);

  // Dispute modal state
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [disputeSummary, setDisputeSummary] = useState('');

  useEffect(() => {
    setWorkspaceMode('provider');
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProviderTab | null;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    fetchActiveCategories().then(setCategories);
    fetchSubscriptionPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (providerProfile) {
      setProfBusinessName(providerProfile.businessName || providerProfile.fullName);
      setProfBio(providerProfile.bio || '');
      setProfQualifications(providerProfile.qualifications || '');
      setProfPrice(String(providerProfile.startingPriceLkr || 2500));
      setProfProvince(providerProfile.province || 'Western');
      setProfDistrict(providerProfile.district || 'Colombo');
      setProfCity(providerProfile.city || '');
      setWorkingDays(providerProfile.workingDays?.length ? providerProfile.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      setTimeSlots(providerProfile.timeSlots || '08:00 AM - 06:00 PM');
      setSrvProvince(providerProfile.province || 'Western');
      setSrvDistrict(providerProfile.district || 'Colombo');
      setSrvCity(providerProfile.city || '');
      setSrvCoverage(providerProfile.coverageDistricts?.length ? providerProfile.coverageDistricts : [providerProfile.district || 'Colombo']);
      if (providerProfile.categoryIds?.length) {
        const firstCat = categories.find((c) => c.id === providerProfile.categoryIds[0]) || categories[0];
        setSrvCatId(firstCat.id);
        setSrvSubcat(firstCat.subcategories[0] || 'General');
      }
    }
  }, [providerProfile, categories]);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubs = [
      onSnapshot(
        query(collection(db, 'serviceListings'), where('providerId', '==', uid)),
        (snap) => setMyListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceListing, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'serviceListings')
      ),
      onSnapshot(
        query(collection(db, 'jobRequests'), where('status', 'in', ['open', 'quoted'])),
        (snap) => setOpenJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobRequest, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'jobRequests')
      ),
      onSnapshot(
        query(collection(db, 'jobRequests'), where('assignedProviderId', '==', uid)),
        (snap) => setAssignedJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobRequest, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'jobRequests')
      ),
      onSnapshot(
        query(collection(db, 'quotations'), where('providerId', '==', uid)),
        (snap) => setMyQuotations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quotation, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
      ),
      onSnapshot(
        query(collection(db, 'bookings'), where('providerId', '==', uid)),
        (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
      ),
      onSnapshot(
        query(collection(db, 'reviews'), where('providerId', '==', uid), where('isPublished', '==', true)),
        (snap) => setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewItem, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
      ),
      onSnapshot(
        query(collection(db, 'commissionRecords'), where('providerId', '==', uid)),
        (snap) => setCommissions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionRecord, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'commissionRecords')
      ),
      onSnapshot(
        query(collection(db, 'subscriptions'), where('providerId', '==', uid)),
        (snap) => setSubscriptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubscriptionRecord, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
      ),
      onSnapshot(
        query(collection(db, 'featuredListings'), where('providerId', '==', uid)),
        (snap) => setFeaturedPromos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeaturedListing, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'featuredListings')
      ),
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, firebaseUser]);

  const activeSubscription = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    if (active.length === 0) return null;
    return active[active.length - 1];
  }, [subscriptions]);

  const currentPlan = useMemo(() => {
    const planId = activeSubscription?.planId || providerProfile?.subscriptionPlanId || 'free';
    return plans.find((p) => p.id === planId) || plans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];
  }, [activeSubscription, providerProfile, plans]);

  const filteredOpenJobs = useMemo(() => {
    if (!firebaseUser) return [];
    const notMine = openJobs.filter((j) => j.customerId !== firebaseUser.uid);
    if (jobScopeFilter === 'all' || !providerProfile) return notMine;
    return notMine.filter((j) => {
      const catMatch = providerProfile.categoryIds.includes(j.categoryId);
      const distMatch =
        providerProfile.coverageDistricts.includes(j.district) || providerProfile.district === j.district;
      return catMatch || distMatch;
    });
  }, [openJobs, firebaseUser, providerProfile, jobScopeFilter]);

  const earningsSummary = useMemo(() => {
    const gross = commissions.reduce((acc, c) => acc + (c.grossAmountLkr || 0), 0);
    const fee = commissions.reduce((acc, c) => acc + (c.commissionAmountLkr || 0), 0);
    const net = commissions.reduce((acc, c) => acc + (c.netProviderLkr || 0), 0);
    return { gross, fee, net };
  }, [commissions]);

  if (!authReady) {
    return <div className="p-12 text-center text-sm text-slate-500">{t('loadingText')}</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-[70vh] bg-[#F5F8FD] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-[#142B4A]">Sign in to access Provider Dashboard</h1>
          <p className="text-sm text-slate-600">
            Use one MYSERVICE account for both Customer Mode and Service Provider Mode.
          </p>
          <Link to="/login" className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
            {t('navSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  if (!providerProfile) {
    return (
      <div className="bg-[#F5F8FD] min-h-screen py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <ModeSwitcherBanner />
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#142B4A]">
              Activate Provider Mode on Your Account
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              You do not need a separate account. Complete your MYSERVICE Provider Profile once to publish services, respond to customer jobs across Sri Lanka, and send quotations. You always keep your Customer Mode privileges.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/become-provider"
                className="px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700"
              >
                Complete Provider Registration
              </Link>
              <Link
                to="/dashboard"
                className="px-5 py-3 rounded-xl border border-slate-200 text-[#142B4A] text-sm font-semibold hover:bg-slate-50"
              >
                Back to Customer Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;
  const activeCount = myListings.filter((l) => l.isActive).length;
  const canAddMoreListings = myListings.length < currentPlan.listingLimit;

  const navItems: {
    id: ProviderTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'profile', label: '2. My Profile', icon: User },
    { id: 'services', label: '3. My Services', icon: Briefcase, count: myListings.length },
    { id: 'add-service', label: '4. Add New Service', icon: PlusCircle },
    { id: 'edit-service', label: '5. Edit Services', icon: Edit3 },
    { id: 'incoming-jobs', label: '6. Incoming Jobs', icon: ClipboardList, count: filteredOpenJobs.length },
    { id: 'send-quote', label: '7. Send Quotations', icon: Send },
    { id: 'my-quotes', label: '8. My Quotations', icon: FileText, count: myQuotations.length },
    { id: 'accepted-jobs', label: '9. Accepted Jobs', icon: CheckCircle2, count: assignedJobs.length },
    { id: 'bookings', label: '10. Bookings', icon: CalendarCheck, count: bookings.length },
    { id: 'calendar', label: '11. Calendar & Hours', icon: Calendar },
    { id: 'messages', label: '12. Messages', icon: MessageSquare },
    { id: 'reviews', label: '13. Customer Reviews', icon: Star, count: reviews.length },
    { id: 'earnings', label: '14. Earnings', icon: DollarSign },
    { id: 'commissions', label: '15. Commission Records', icon: BarChart3, count: commissions.length },
    { id: 'subscriptions', label: '16. Subscription Plans', icon: CreditCard },
    { id: 'promotions', label: '17. Featured Listings', icon: Sparkles, count: featuredPromos.length },
    { id: 'notifications', label: '18. Notifications', icon: Bell, count: unreadNotifCount },
    { id: 'settings', label: '19. Account Settings', icon: Settings },
  ];

  const switchTab = (tab: ProviderTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setErrorMsg(null);
  };

  const startEditListing = (listing: ServiceListing) => {
    setEditingListing(listing);
    setSrvTitle(listing.title);
    setSrvCatId(listing.categoryId);
    setSrvSubcat(listing.subcategory);
    setSrvDesc(listing.description);
    setSrvProvince(listing.province);
    setSrvDistrict(listing.district);
    setSrvCity(listing.city);
    setSrvCoverage(listing.coverageDistricts);
    setSrvPrice(String(listing.priceLkr));
    setSrvUnit(listing.priceUnit || 'per service');
    setSrvImage(listing.imageUrl || LISTING_PRESET_IMAGES[0].url);
    switchTab('edit-service');
  };

  const resetServiceForm = () => {
    setEditingListing(null);
    setSrvTitle('');
    setSrvDesc('');
    setSrvCity(providerProfile.city || '');
    setSrvPrice(String(providerProfile.startingPriceLkr || 2500));
    setSrvUnit('per service');
  };

  const handleSaveService = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (!isEdit && !canAddMoreListings) {
      setErrorMsg(
        `Your current ${currentPlan.name} plan allows up to ${currentPlan.listingLimit} services. Upgrade in Subscription Plans to publish more.`
      );
      return;
    }
    if (srvTitle.trim().length < 4 || srvDesc.trim().length < 10) {
      setErrorMsg('Please enter a service title (min 4 chars) and description (min 10 chars).');
      return;
    }

    setBusy(true);
    try {
      if (isEdit && editingListing) {
        await updateServiceListing(editingListing, {
          title: srvTitle,
          categoryId: srvCatId,
          subcategory: srvSubcat,
          description: srvDesc,
          province: srvProvince,
          district: srvDistrict,
          city: srvCity,
          coverageDistricts: srvCoverage.length ? srvCoverage : [srvDistrict],
          priceLkr: Number(srvPrice) || 0,
          priceUnit: srvUnit,
          imageUrl: srvImage,
        });
        setFeedback(`Updated service "${srvTitle}".`);
        setEditingListing(null);
      } else {
        await createServiceListing(providerProfile, {
          title: srvTitle,
          categoryId: srvCatId,
          subcategory: srvSubcat,
          description: srvDesc,
          province: srvProvince,
          district: srvDistrict,
          city: srvCity,
          coverageDistricts: srvCoverage.length ? srvCoverage : [srvDistrict],
          priceLkr: Number(srvPrice) || 0,
          priceUnit: srvUnit,
          imageUrl: srvImage,
        });
        setFeedback(`Published new service "${srvTitle}".`);
        resetServiceForm();
      }
      switchTab('services');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save service.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteJob) return;
    setErrorMsg(null);
    const amount = Number(quoteAmount);
    if (!amount || amount <= 0) {
      setErrorMsg('Enter a valid LKR quotation amount.');
      return;
    }
    setBusy(true);
    try {
      await submitQuotation({
        job: quoteJob,
        provider: providerProfile,
        amountLkr: amount,
        estimatedDuration: quoteDuration,
        notes: quoteNotes,
      });
      setFeedback(`Quotation of LKR ${amount.toLocaleString()} sent to ${quoteJob.customerName}.`);
      setQuoteJob(null);
      setQuoteAmount('');
      setQuoteNotes('');
      switchTab('my-quotes');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit quotation.');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawQuote = async () => {
    if (!confirmWithdrawQuote) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'quotations', confirmWithdrawQuote.id), {
        jobId: confirmWithdrawQuote.jobId,
        jobTitle: confirmWithdrawQuote.jobTitle,
        customerId: confirmWithdrawQuote.customerId,
        providerId: confirmWithdrawQuote.providerId,
        providerName: confirmWithdrawQuote.providerName,
        providerVerified: confirmWithdrawQuote.providerVerified ?? false,
        amountLkr: confirmWithdrawQuote.amountLkr,
        estimatedDuration: confirmWithdrawQuote.estimatedDuration,
        notes: confirmWithdrawQuote.notes || '',
        status: 'withdrawn',
        createdAt: confirmWithdrawQuote.createdAt,
        updatedAt: serverTimestamp(),
      });
      setFeedback(`Withdrew quotation for "${confirmWithdrawQuote.jobTitle}".`);
      setConfirmWithdrawQuote(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `quotations/${confirmWithdrawQuote.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRevealAddress = async (jobId: string) => {
    setLoadingAddressId(jobId);
    try {
      const addr = await fetchJobPrivateAddress(jobId);
      setPrivateAddresses((prev) => ({ ...prev, [jobId]: addr }));
    } finally {
      setLoadingAddressId(null);
    }
  };

  const handleSaveProviderProfileOrCalendar = async (e: React.FormEvent, msg: string) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      await updateDoc(doc(db, 'providerProfiles', providerProfile.id), {
        userId: providerProfile.userId,
        fullName: providerProfile.fullName,
        businessName: profBusinessName.trim().slice(0, 120),
        photoURL: providerProfile.photoURL || '',
        province: profProvince,
        district: profDistrict,
        city: profCity.trim().slice(0, 80) || 'Colombo',
        categoryIds: providerProfile.categoryIds,
        subcategories: providerProfile.subcategories || [],
        coverageDistricts: providerProfile.coverageDistricts,
        yearsExperience: providerProfile.yearsExperience,
        bio: profBio.trim().slice(0, 1500),
        qualifications: profQualifications.trim().slice(0, 600),
        startingPriceLkr: Math.max(0, Number(profPrice) || 0),
        workingDays,
        timeSlots: timeSlots.trim().slice(0, 160),
        portfolioUrls: providerProfile.portfolioUrls || [],
        ...(Array.isArray(providerProfile.photoThumbnails) && providerProfile.photoThumbnails.length > 0
          ? { photoThumbnails: providerProfile.photoThumbnails }
          : {}),
        ...(Array.isArray(providerProfile.photoCaptions) && providerProfile.photoCaptions.length > 0
          ? { photoCaptions: providerProfile.photoCaptions }
          : {}),
        verificationStatus: providerProfile.verificationStatus,
        rejectionReason: providerProfile.rejectionReason || '',
        ratingAvg: providerProfile.ratingAvg ?? 0,
        reviewCount: providerProfile.reviewCount ?? 0,
        subscriptionPlanId: providerProfile.subscriptionPlanId || 'free',
        isSample: providerProfile.isSample ?? false,
        createdAt: providerProfile.createdAt,
        updatedAt: serverTimestamp(),
      });
      setFeedback(msg);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `providerProfiles/${providerProfile.id}`);
    } finally {
      setBusy(false);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === srvCatId) || categories[0];

  return (
    <div className="bg-[#F5F8FD] min-h-screen pb-24 md:pb-12">
      <ModeSwitcherBanner />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {providerProfile.verificationStatus === 'pending_review' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Provider Verification Pending Admin Review</p>
                <p className="text-xs text-amber-800">
                  Your private NIC/BR and certificates are queued for verification. You can prepare services, update hours, and switch to Customer Mode anytime.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-900"
            >
              Switch to Customer Mode
            </Link>
          </div>
        )}

        {providerProfile.verificationStatus === 'rejected' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Needs Updates</p>
                <p className="text-xs text-red-800">
                  {providerProfile.rejectionReason || 'Please review your credentials and resubmit.'}
                </p>
              </div>
            </div>
            <Link
              to="/become-provider"
              className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
            >
              Update & Resubmit
            </Link>
          </div>
        )}

        {providerProfile.verificationStatus === 'suspended' && (
          <div className="p-4 rounded-2xl bg-red-100 border border-red-300 text-red-900 text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
            <span>Your provider account is currently suspended. Contact support@myservice.lk for review.</span>
          </div>
        )}

        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Responsive Navigation: Horizontal Scroll Strip on Mobile, Sidebar on Desktop */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-2 sm:p-3">
            <div className="hidden lg:block px-3 py-2.5 border-b border-slate-100 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Provider Workspace
              </p>
              <p className="font-bold text-sm text-[#142B4A] truncate">
                {providerProfile.businessName || providerProfile.fullName}
              </p>
              <p className="text-xs mt-0.5 flex items-center gap-1">
                {providerProfile.verificationStatus === 'verified' ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Provider
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium capitalize">
                    Status: {providerProfile.verificationStatus.replace('_', ' ')}
                  </span>
                )}
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
                    onClick={() => switchTab(item.id)}
                    className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors text-left ${
                      active
                        ? 'bg-[#EAF2FF] text-[#2563EB] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#142B4A]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="font-mono text-xs font-bold text-[#2563EB] tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Workspace Content */}
          <div className="lg:col-span-9 space-y-6">
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs text-slate-500">Published Services</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] mt-1 tabular-nums">
                      {activeCount} / {currentPlan.listingLimit}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs text-slate-500">Matching Open Jobs</p>
                    <p className="font-mono text-2xl font-bold text-[#2563EB] mt-1 tabular-nums">
                      {filteredOpenJobs.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs text-slate-500">Active Bookings</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] mt-1 tabular-nums">
                      {bookings.filter((b) => ['pending_confirmation', 'confirmed', 'in_progress'].includes(b.status)).length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs text-slate-500">Net Earnings</p>
                    <p className="font-mono text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                      LKR {earningsSummary.net.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-[#142B4A]">Quick Provider Actions</h2>
                    <p className="text-xs text-slate-500">
                      Current Plan: <strong>{currentPlan.name}</strong> · Rating:{' '}
                      {(providerProfile.ratingAvg || 0).toFixed(1)} ({reviews.length} reviews)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => switchTab('add-service')}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700"
                    >
                      + Add New Service
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('incoming-jobs')}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-[#142B4A] hover:bg-slate-50"
                    >
                      Browse Customer Jobs ({filteredOpenJobs.length})
                    </button>
                    <Link
                      to={`/providers/${providerProfile.id}`}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Public Profile
                    </Link>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#142B4A]">Recent Incoming Jobs</h3>
                    <button
                      type="button"
                      onClick={() => switchTab('incoming-jobs')}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {filteredOpenJobs.length === 0 ? (
                    <p className="text-sm text-slate-500">No open jobs match your areas right now.</p>
                  ) : (
                    filteredOpenJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-4 rounded-xl border border-slate-100 bg-[#F5F8FD] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-[#142B4A]">{job.title}</p>
                          <p className="text-xs text-slate-500">
                            {job.city}, {getDistrictLabel(job.district, lang)} · Preferred: {job.preferredDate}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteJob(job);
                            switchTab('send-quote');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                        >
                          Send Quotation
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. MY PROFILE */}
            {activeTab === 'profile' && (
              <form
                onSubmit={(e) => handleSaveProviderProfileOrCalendar(e, 'Provider profile updated.')}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-[#142B4A]">My Provider Profile</h2>
                    <p className="text-xs text-slate-500">Public details shown on Find Professionals & Provider Profile pages.</p>
                  </div>
                  <Link
                    to={`/providers/${providerProfile.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    <Eye className="w-4 h-4" /> View Public Page
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">Business / Display Name</label>
                    <input
                      type="text"
                      required
                      value={profBusinessName}
                      onChange={(e) => setProfBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">Starting Rate (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      value={profPrice}
                      onChange={(e) => setProfPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">Province</label>
                    <select
                      value={profProvince}
                      onChange={(e) => {
                        const p = SRI_LANKA_PROVINCES.find((x) => x.id === e.target.value);
                        setProfProvince(e.target.value);
                        if (p && p.districts[0]) setProfDistrict(p.districts[0].id);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {SRI_LANKA_PROVINCES.map((p) => (
                        <option key={p.id} value={p.id}>{p.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1">District</label>
                    <select
                      value={profDistrict}
                      onChange={(e) => setProfDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {(SRI_LANKA_PROVINCES.find((p) => p.id === profProvince)?.districts || []).map((d) => (
                        <option key={d.id} value={d.id}>{d.name_en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Primary City / Town</label>
                  <input
                    type="text"
                    required
                    value={profCity}
                    onChange={(e) => setProfCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Bio & Service Experience</label>
                  <textarea
                    rows={4}
                    required
                    minLength={10}
                    value={profBio}
                    onChange={(e) => setProfBio(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Qualifications & Certifications Summary</label>
                  <input
                    type="text"
                    value={profQualifications}
                    onChange={(e) => setProfQualifications(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {busy ? 'Saving...' : 'Save Profile'}
                  </button>
                  <Link
                    to="/become-provider"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Edit Categories / Verification Docs
                  </Link>
                </div>
              </form>
            )}

            {/* 3. MY SERVICES */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#142B4A]">My Services ({myListings.length} / {currentPlan.listingLimit})</h2>
                    <p className="text-xs text-slate-500">Manage pricing, pause/resume visibility, or promote a listing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetServiceForm();
                      switchTab('add-service');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
                  >
                    + Add New Service
                  </button>
                </div>

                {myListings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                    <p className="text-sm text-slate-600">You have not published any service listings yet.</p>
                    <button
                      type="button"
                      onClick={() => switchTab('add-service')}
                      className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
                    >
                      Publish Your First Service
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {myListings.map((srv) => (
                      <div key={srv.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className={srv.isActive ? 'text-emerald-700' : 'text-slate-500'}>
                              {srv.isActive ? 'Active' : 'Paused'}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">{srv.subcategory}</span>
                            {srv.isFeatured && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[#2563EB]">Featured</span>
                              </>
                            )}
                          </div>
                          <h3 className="font-bold text-[#142B4A]">{srv.title}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2">{srv.description}</p>
                          <p className="font-mono text-sm font-bold text-[#2563EB] tabular-nums">
                            LKR {srv.priceLkr.toLocaleString()} {srv.priceUnit}
                          </p>
                        </div>
                        <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditListing(srv)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A] hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => updateServiceListing(srv, { isActive: !srv.isActive })}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            {srv.isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            {srv.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteListing(srv)}
                            className="px-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. ADD NEW SERVICE & 5. EDIT SERVICE */}
            {(activeTab === 'add-service' || activeTab === 'edit-service') && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                {activeTab === 'edit-service' && !editingListing ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#142B4A]">Select a Service to Edit</h2>
                    {myListings.length === 0 ? (
                      <p className="text-sm text-slate-500">No services found. Add a new service first.</p>
                    ) : (
                      <div className="space-y-2">
                        {myListings.map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => startEditListing(srv)}
                            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#2563EB] flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-sm text-[#142B4A]">{srv.title}</p>
                              <p className="text-xs text-slate-500">LKR {srv.priceLkr.toLocaleString()} {srv.priceUnit}</p>
                            </div>
                            <span className="text-xs font-semibold text-[#2563EB]">Edit &rarr;</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSaveService(e, activeTab === 'edit-service')} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#142B4A]">
                        {activeTab === 'edit-service' ? `Edit Service: ${editingListing?.title}` : 'Publish a New Service'}
                      </h2>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        Slots: {myListings.length} / {currentPlan.listingLimit}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#142B4A] mb-1">Service Title *</label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        placeholder="e.g., Certified Three-Phase Wiring & Surge Protection"
                        value={srvTitle}
                        onChange={(e) => setSrvTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Category</label>
                        <select
                          value={srvCatId}
                          onChange={(e) => {
                            const cat = categories.find((c) => c.id === e.target.value);
                            setSrvCatId(e.target.value);
                            if (cat && cat.subcategories[0]) setSrvSubcat(cat.subcategories[0]);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {lang === 'si' ? c.name_si : lang === 'ta' ? c.name_ta : c.name_en}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Subcategory</label>
                        <select
                          value={srvSubcat}
                          onChange={(e) => setSrvSubcat(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          {(selectedCategoryObj?.subcategories || []).map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#142B4A] mb-1">Service Description *</label>
                      <textarea
                        rows={4}
                        required
                        minLength={10}
                        placeholder="Describe scope, tools included, safety checks, and service guarantees..."
                        value={srvDesc}
                        onChange={(e) => setSrvDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Price (LKR) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={srvPrice}
                          onChange={(e) => setSrvPrice(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Price Unit</label>
                        <input
                          type="text"
                          value={srvUnit}
                          onChange={(e) => setSrvUnit(e.target.value)}
                          placeholder="per visit / per hour / per project"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Service Image Theme</label>
                        <select
                          value={srvImage}
                          onChange={(e) => setSrvImage(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          {LISTING_PRESET_IMAGES.map((img) => (
                            <option key={img.url} value={img.url}>{img.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Province</label>
                        <select
                          value={srvProvince}
                          onChange={(e) => {
                            const p = SRI_LANKA_PROVINCES.find((x) => x.id === e.target.value);
                            setSrvProvince(e.target.value);
                            if (p && p.districts[0]) setSrvDistrict(p.districts[0].id);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          {SRI_LANKA_PROVINCES.map((p) => (
                            <option key={p.id} value={p.id}>{p.name_en}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Base District</label>
                        <select
                          value={srvDistrict}
                          onChange={(e) => setSrvDistrict(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          {(SRI_LANKA_PROVINCES.find((p) => p.id === srvProvince)?.districts || []).map((d) => (
                            <option key={d.id} value={d.id}>{d.name_en}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={srvCity}
                          onChange={(e) => setSrvCity(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busy ? 'Saving...' : activeTab === 'edit-service' ? 'Save Changes' : 'Publish Service'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetServiceForm();
                          switchTab('services');
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 6. INCOMING JOB REQUESTS */}
            {activeTab === 'incoming-jobs' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#142B4A]">Incoming Customer Job Requests</h2>
                    <p className="text-xs text-slate-500">Customer exact street addresses stay private until your quotation is accepted.</p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setJobScopeFilter('matching')}
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        jobScopeFilter === 'matching' ? 'bg-[#EAF2FF] text-[#2563EB]' : 'text-slate-600'
                      }`}
                    >
                      Matching My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobScopeFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        jobScopeFilter === 'all' ? 'bg-[#EAF2FF] text-[#2563EB]' : 'text-slate-600'
                      }`}
                    >
                      All Open Jobs
                    </button>
                  </div>
                </div>

                {filteredOpenJobs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No open customer job requests found in this filter.
                  </div>
                ) : (
                  filteredOpenJobs.map((job) => (
                    <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-semibold text-[#2563EB]">{job.subcategory}</span>
                            <span>·</span>
                            <span>{job.city}, {getDistrictLabel(job.district, lang)}</span>
                            <span>·</span>
                            <span>Target: {job.preferredDate}</span>
                          </div>
                          <h3 className="font-bold text-[#142B4A]">{job.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteJob(job);
                            setQuoteAmount(String(job.budgetMaxLkr || job.budgetMinLkr || providerProfile.startingPriceLkr || 3500));
                            switchTab('send-quote');
                          }}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700"
                        >
                          Send Quotation
                        </button>
                      </div>
                      <p className="text-sm text-slate-600">{job.description}</p>
                      {job.photoThumbnails && job.photoThumbnails.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {job.photoThumbnails.map((src, idx) => (
                            <img
                              key={idx}
                              src={src}
                              alt={job.photoCaptions?.[idx] || `Job attachment ${idx + 1}`}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Customer: {job.customerName}</span>
                        {(job.budgetMinLkr || job.budgetMaxLkr) ? (
                          <span className="font-mono font-semibold text-[#142B4A]">
                            Budget: LKR {(job.budgetMinLkr || 0).toLocaleString()} - {(job.budgetMaxLkr || 0).toLocaleString()}
                          </span>
                        ) : null}
                        <span>Quotations received: {job.quotationCount || 0}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 7. SEND QUOTATIONS */}
            {activeTab === 'send-quote' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-[#142B4A]">Send a Quotation</h2>
                {!quoteJob ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Select an open customer job request to prepare a quotation:</p>
                    {filteredOpenJobs.length === 0 ? (
                      <p className="text-sm text-slate-500">No open jobs available right now.</p>
                    ) : (
                      filteredOpenJobs.map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => {
                            setQuoteJob(job);
                            setQuoteAmount(String(job.budgetMaxLkr || job.budgetMinLkr || providerProfile.startingPriceLkr || 3500));
                          }}
                          className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#2563EB] flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-sm text-[#142B4A]">{job.title}</p>
                            <p className="text-xs text-slate-500">{job.city}, {job.district} · {job.preferredDate}</p>
                          </div>
                          <span className="text-xs font-semibold text-[#2563EB]">Select &rarr;</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitQuotation} className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#F5F8FD] border border-blue-100">
                      <p className="text-xs text-slate-500">Quoting on Job Request from {quoteJob.customerName}</p>
                      <p className="font-bold text-[#142B4A]">{quoteJob.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{quoteJob.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Quoted Amount (LKR) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#142B4A] mb-1">Estimated Duration *</label>
                        <input
                          type="text"
                          required
                          value={quoteDuration}
                          onChange={(e) => setQuoteDuration(e.target.value)}
                          placeholder="e.g., 2-3 hours / 1 day"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#142B4A] mb-1">Quotation Scope & Notes</label>
                      <textarea
                        rows={4}
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Clarify labor, inspection, parts policy, and warranty..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busy ? 'Sending...' : 'Submit Quotation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteJob(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
                      >
                        Choose Another Job
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 8. MY QUOTATIONS */}
            {activeTab === 'my-quotes' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">My Submitted Quotations</h2>
                {myQuotations.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    You have not sent any quotations yet.
                  </div>
                ) : (
                  myQuotations.map((q) => (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold capitalize text-[#2563EB] mb-1">
                          Status: {q.status}
                        </p>
                        <h3 className="font-bold text-[#142B4A]">{q.jobTitle}</h3>
                        <p className="font-mono text-sm font-bold text-[#142B4A] mt-1 tabular-nums">
                          LKR {q.amountLkr.toLocaleString()} · {q.estimatedDuration}
                        </p>
                        {q.notes && <p className="text-xs text-slate-600 mt-1">{q.notes}</p>}
                      </div>
                      {q.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setConfirmWithdrawQuote(q)}
                          className="px-4 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Withdraw Quotation
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 9. ACCEPTED JOBS (Reveal Private Address) */}
            {activeTab === 'accepted-jobs' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#142B4A]">Accepted Jobs & Customer Site Addresses</h2>
                  <p className="text-xs text-slate-500">
                    Customer street addresses and contact phone numbers unlock here once your quotation is accepted.
                  </p>
                </div>

                {assignedJobs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No assigned jobs yet. Once a customer accepts your quotation, the job appears here.
                  </div>
                ) : (
                  assignedJobs.map((job) => {
                    const addr = privateAddresses[job.id];
                    return (
                      <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-emerald-700 capitalize">Job Status: {job.status}</p>
                            <h3 className="font-bold text-[#142B4A]">{job.title}</h3>
                            <p className="text-xs text-slate-500">
                              Customer: {job.customerName} · {job.city}, {job.district} · Scheduled: {job.preferredDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={loadingAddressId === job.id}
                            onClick={() => handleRevealAddress(job.id)}
                            className="px-4 py-2 rounded-xl bg-[#EAF2FF] text-[#2563EB] text-xs font-semibold hover:bg-blue-100 inline-flex items-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            {loadingAddressId === job.id ? 'Loading...' : addr ? 'Refresh Private Address' : 'Reveal Private Customer Address'}
                          </button>
                        </div>
                        <p className="text-sm text-slate-600">{job.description}</p>
                        {addr && (
                          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                            <p className="font-semibold">Authorized Private Address Details:</p>
                            <p>Exact Address: {addr.exactAddress}</p>
                            <p>Contact Phone: {addr.contactPhone || 'Not specified — message customer in workspace'}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 10. BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Bookings ({bookings.length})</h2>
                {bookings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No customer bookings yet.
                  </div>
                ) : (
                  bookings.map((bk) => (
                    <div key={bk.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="text-[#2563EB] capitalize">{bk.status.replace('_', ' ')}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600 capitalize">Payment: {bk.paymentStatus.replace('_', ' ')}</span>
                        </div>
                        <h3 className="font-bold text-[#142B4A]">{bk.serviceTitle}</h3>
                        <p className="text-xs text-slate-500">
                          Customer: {bk.customerName} · {bk.city}, {bk.district} · {bk.scheduledDate} {bk.scheduledTime}
                        </p>
                        <p className="font-mono text-sm font-bold text-[#142B4A] tabular-nums">
                          LKR {bk.amountLkr.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {bk.status === 'pending_confirmation' && (
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(bk, 'confirmed')}
                            className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                          >
                            Confirm Booking
                          </button>
                        )}
                        {bk.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(bk, 'in_progress')}
                            className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                          >
                            Start Work
                          </button>
                        )}
                        {['confirmed', 'in_progress'].includes(bk.status) && (
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(bk, 'completed')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                          >
                            Mark Completed
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await getOrCreateConversation({
                              customerId: bk.customerId,
                              customerName: bk.customerName,
                              providerId: bk.providerId,
                              providerName: bk.providerName,
                              contextTitle: bk.serviceTitle,
                            });
                            switchTab('messages');
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A]"
                        >
                          Message Customer
                        </button>
                        {['pending_confirmation', 'confirmed'].includes(bk.status) && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeclineBooking(bk)}
                            className="px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDisputeBooking(bk)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500"
                        >
                          Report Issue
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 11. CALENDAR / AVAILABILITY */}
            {activeTab === 'calendar' && (
              <form
                onSubmit={(e) => handleSaveProviderProfileOrCalendar(e, 'Availability schedule saved.')}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#142B4A]">Calendar & Working Availability</h2>
                  <p className="text-xs text-slate-500">Shown publicly on your profile so customers know when you accept jobs.</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#142B4A] mb-2">Working Days</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setWorkingDays((prev) =>
                              prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                            )
                          }
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left transition-colors ${
                            active
                              ? 'border-[#2563EB] bg-[#EAF2FF] text-[#2563EB]'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Daily Time Slots</label>
                  <input
                    type="text"
                    required
                    value={timeSlots}
                    onChange={(e) => setTimeSlots(e.target.value)}
                    placeholder="e.g., 08:00 AM - 06:30 PM (Emergency calls until 9 PM)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy ? 'Saving...' : 'Save Availability'}
                </button>
              </form>
            )}

            {/* 12. MESSAGES */}
            {activeTab === 'messages' && (
              <MessagesPanel
                uid={firebaseUser.uid}
                userName={providerProfile.businessName || providerProfile.fullName}
                role="provider"
              />
            )}

            {/* 13. CUSTOMER REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Customer Reviews ({reviews.length})</h2>
                {reviews.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No published reviews yet. Verified reviews appear here once customers review completed bookings.
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-[#142B4A]">{rev.customerName}</p>
                        <div className="flex items-center gap-1 text-amber-500 font-mono text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 14. EARNINGS */}
            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#142B4A]">Provider Earnings Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500">Gross Booking Value</p>
                    <p className="font-mono text-2xl font-bold text-[#142B4A] mt-1 tabular-nums">
                      LKR {earningsSummary.gross.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500">Platform Commission</p>
                    <p className="font-mono text-2xl font-bold text-slate-700 mt-1 tabular-nums">
                      LKR {earningsSummary.fee.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500">Net Provider Earnings</p>
                    <p className="font-mono text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                      LKR {earningsSummary.net.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
                  All earnings figures above are computed strictly from real booking & commission records in Firestore.
                </div>
              </div>
            )}

            {/* 15. COMMISSION RECORDS */}
            {activeTab === 'commissions' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#142B4A]">Commission Ledger ({commissions.length})</h2>
                {commissions.length === 0 ? (
                  <p className="text-sm text-slate-500">No commission records yet.</p>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {commissions.map((c) => (
                        <div key={c.id} className="rounded-xl border border-slate-200 bg-[#F5F8FD]/50 p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-[#142B4A] truncate">{c.bookingId}</span>
                            <span className="capitalize font-semibold text-[#2563EB]">{c.status}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1 font-mono tabular-nums">
                            <div>
                              <span className="block text-[10px] font-sans text-slate-500">Gross</span>
                              <span>LKR {c.grossAmountLkr.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-sans text-slate-500">Fee ({c.commissionRatePct}%)</span>
                              <span>LKR {c.commissionAmountLkr.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-sans text-slate-500">Net</span>
                              <span className="font-bold text-emerald-700">LKR {c.netProviderLkr.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2 pr-4">Booking ID</th>
                            <th className="py-2 pr-4">Gross</th>
                            <th className="py-2 pr-4">Rate</th>
                            <th className="py-2 pr-4">Commission</th>
                            <th className="py-2 pr-4">Net LKR</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs tabular-nums">
                          {commissions.map((c) => (
                            <tr key={c.id}>
                              <td className="py-2.5 pr-4 text-slate-700">{c.bookingId}</td>
                              <td className="py-2.5 pr-4">LKR {c.grossAmountLkr.toLocaleString()}</td>
                              <td className="py-2.5 pr-4">{c.commissionRatePct}%</td>
                              <td className="py-2.5 pr-4">LKR {c.commissionAmountLkr.toLocaleString()}</td>
                              <td className="py-2.5 pr-4 font-bold text-emerald-700">LKR {c.netProviderLkr.toLocaleString()}</td>
                              <td className="py-2.5 font-sans capitalize text-slate-600">{c.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 16. SUBSCRIPTION PLANS */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#142B4A]">Provider Subscription Plans</h2>
                    <p className="text-xs text-slate-500">
                      Current Active Plan: <strong>{currentPlan.name}</strong> ({currentPlan.listingLimit} listing limit) · Paid upgrades use PayHere Sandbox Demo.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        billingCycle === 'monthly' ? 'bg-[#EAF2FF] text-[#2563EB]' : 'text-slate-600'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        billingCycle === 'yearly' ? 'bg-[#EAF2FF] text-[#2563EB]' : 'text-slate-600'
                      }`}
                    >
                      Yearly (Save ~17%)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {plans.map((plan) => {
                    const price = billingCycle === 'yearly' ? plan.yearlyPriceLkr : plan.monthlyPriceLkr;
                    const isCurrent = currentPlan.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`bg-white rounded-2xl p-6 border flex flex-col justify-between gap-5 ${
                          isCurrent ? 'border-[#2563EB] ring-1 ring-[#2563EB]' : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-[#142B4A]">{plan.name}</h3>
                            {isCurrent && <span className="text-xs font-semibold text-[#2563EB]">Active</span>}
                          </div>
                          <p className="font-mono text-2xl font-extrabold text-[#142B4A] tabular-nums">
                            {price === 0 ? 'Free' : `LKR ${price.toLocaleString()}`}
                            {price > 0 && (
                              <span className="text-xs font-sans font-normal text-slate-500">
                                /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-[#2563EB]">
                            Up to {plan.listingLimit} service listings
                          </p>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            {plan.features.map((f, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {price === 0 ? (
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={async () => {
                              await activateFreeSubscription(firebaseUser.uid, plan);
                              setFeedback(`Activated ${plan.name} plan.`);
                            }}
                            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A] hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isCurrent ? 'Current Plan' : 'Switch to Free'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckoutPlan(plan)}
                            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            {isCurrent ? 'Renew via PayHere Demo' : `Upgrade to ${plan.name}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 17. PROMOTIONS / FEATURED LISTINGS */}
            {activeTab === 'promotions' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#142B4A]">Featured Listing Promotions</h2>
                  <p className="text-xs text-slate-500">
                    Boost a service listing for 14 days via PayHere Sandbox Demo (LKR 1,200).
                  </p>
                </div>

                {myListings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    Publish a service listing first before promoting it.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {myListings.map((srv) => {
                      const activePromo = featuredPromos.find((f) => f.listingId === srv.id && f.isActive);
                      return (
                        <div key={srv.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-[#142B4A]">{srv.title}</h3>
                            <p className="text-xs text-slate-500">
                              {activePromo
                                ? `Featured promotion active until ${new Date(activePromo.expiresAt || '').toLocaleDateString()}`
                                : 'Standard organic placement'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPromoteListing(srv)}
                            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Award className="w-4 h-4" />
                            Promote (LKR 1,200 Demo)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 18. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#142B4A]">Notifications</h2>
                {notifications.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                    No provider notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markNotificationRead(n)}
                      className={`border rounded-2xl p-4 cursor-pointer transition-colors ${
                        n.isRead ? 'bg-white border-slate-200' : 'bg-[#EAF2FF] border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-[#142B4A]">{n.title}</p>
                        {!n.isRead && <span className="text-xs font-semibold text-[#2563EB]">Unread</span>}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 19. ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-[#142B4A]">Account Settings</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-[#142B4A]">Preferred Interface Language</p>
                      <p className="text-xs text-slate-500">Switch between English, Sinhala, and Tamil anytime.</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(['en', 'si', 'ta'] as LanguageCode[]).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setLang(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            lang === code ? 'bg-[#2563EB] text-white' : 'border border-slate-200 text-slate-600'
                          }`}
                        >
                          {code === 'en' ? 'English' : code === 'si' ? 'සිංහල' : 'தமிழ்'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-[#142B4A]">Customer Mode Access</p>
                      <p className="text-xs text-slate-500">Hire other professionals on MYSERVICE using the exact same account.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceMode('customer');
                        navigate('/dashboard');
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A] hover:bg-slate-50"
                    >
                      Open Customer Dashboard
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      Signed in as {userProfile?.displayName} ({firebaseUser.email})
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="px-4 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      {t('navSignOut')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={Boolean(confirmDeleteListing)}
        title="Delete Service Listing?"
        description={`Are you sure you want to permanently remove "${confirmDeleteListing?.title}"?`}
        confirmLabel="Delete Service"
        destructive
        onCancel={() => setConfirmDeleteListing(null)}
        onConfirm={async () => {
          if (!confirmDeleteListing) return;
          await deleteServiceListing(confirmDeleteListing.id);
          setFeedback(`Deleted service "${confirmDeleteListing.title}".`);
          setConfirmDeleteListing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmWithdrawQuote)}
        title="Withdraw Quotation?"
        description={`Withdraw your LKR ${confirmWithdrawQuote?.amountLkr.toLocaleString()} quotation on "${confirmWithdrawQuote?.jobTitle}"?`}
        confirmLabel="Withdraw Quotation"
        destructive
        onCancel={() => setConfirmWithdrawQuote(null)}
        onConfirm={handleWithdrawQuote}
      />

      <ConfirmDialog
        open={Boolean(confirmDeclineBooking)}
        title="Cancel Booking?"
        description={`Cancel booking for "${confirmDeclineBooking?.serviceTitle}"? The customer will be notified.`}
        confirmLabel="Cancel Booking"
        destructive
        onCancel={() => setConfirmDeclineBooking(null)}
        onConfirm={async () => {
          if (!confirmDeclineBooking) return;
          await updateBookingStatus(confirmDeclineBooking, 'cancelled');
          setFeedback(`Booking "${confirmDeclineBooking.serviceTitle}" cancelled.`);
          setConfirmDeclineBooking(null);
        }}
      />

      {/* Dispute Modal */}
      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await submitReportOrDispute({
                kind: 'dispute',
                reporterId: firebaseUser.uid,
                targetUserId: disputeBooking.customerId,
                bookingId: disputeBooking.id,
                details: disputeSummary,
              });
              setFeedback('Dispute submitted to MYSERVICE Admin Desk.');
              setDisputeBooking(null);
              setDisputeSummary('');
            }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-lg text-[#142B4A]">Report Booking Issue</h3>
            <p className="text-xs text-slate-500">Booking: {disputeBooking.serviceTitle}</p>
            <textarea
              required
              minLength={5}
              rows={4}
              value={disputeSummary}
              onChange={(e) => setDisputeSummary(e.target.value)}
              placeholder="Describe the issue clearly for admin review..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold">
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PayHere Sandbox Demo for Subscription Upgrade */}
      {checkoutPlan && (
        <PayHereDemoModal
          open={Boolean(checkoutPlan)}
          uid={firebaseUser.uid}
          paymentType="subscription"
          referenceId={checkoutPlan.id}
          amountLkr={billingCycle === 'yearly' ? checkoutPlan.yearlyPriceLkr : checkoutPlan.monthlyPriceLkr}
          itemTitle={`${checkoutPlan.name} Plan (${billingCycle})`}
          onClose={() => setCheckoutPlan(null)}
          onVerified={async ({ transactionRef, gatewayMode }) => {
            const amount = billingCycle === 'yearly' ? checkoutPlan.yearlyPriceLkr : checkoutPlan.monthlyPriceLkr;
            await recordVerifiedSandboxPayment({
              uid: firebaseUser.uid,
              paymentType: 'subscription',
              referenceId: checkoutPlan.id,
              amountLkr: amount,
              transactionRef,
              gatewayMode,
              plan: checkoutPlan,
              billingCycle,
            });
            setFeedback(`Subscribed to ${checkoutPlan.name} (${billingCycle}) via PayHere Sandbox Demo.`);
          }}
        />
      )}

      {/* PayHere Sandbox Demo for Featured Listing Promotion */}
      {promoteListing && (
        <PayHereDemoModal
          open={Boolean(promoteListing)}
          uid={firebaseUser.uid}
          paymentType="featured_listing"
          referenceId={promoteListing.id}
          amountLkr={1200}
          itemTitle={`14-Day Featured Boost: ${promoteListing.title}`}
          onClose={() => setPromoteListing(null)}
          onVerified={async ({ transactionRef, gatewayMode }) => {
            await recordVerifiedSandboxPayment({
              uid: firebaseUser.uid,
              paymentType: 'featured_listing',
              referenceId: promoteListing.id,
              amountLkr: 1200,
              transactionRef,
              gatewayMode,
            });
            setFeedback(`Featured promotion activated for "${promoteListing.title}" (14 days, Demo).`);
          }}
        />
      )}
    </div>
  );
};
