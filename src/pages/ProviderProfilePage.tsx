import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SAMPLE_LISTINGS, SAMPLE_PROVIDERS } from '../data/sampleCatalog';
import {
  createDirectBooking,
  fetchActiveListings,
  fetchProviderById,
  fetchPublicAdminSettings,
  fetchPublishedReviewsForProvider,
  getOrCreateConversation,
  submitReportOrDispute,
  toggleSavedProvider,
} from '../lib/marketplaceService';
import { ProviderProfile, ReviewItem, ServiceListing } from '../types/marketplace';

export const ProviderProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, userProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking & Report states
  const [bookingListing, setBookingListing] = useState<ServiceListing | null>(null);
  const [bookingDate, setBookingDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState('09:00 AM');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  usePageMeta(provider?.businessName || provider?.fullName || 'Provider Profile', 'View provider profile, services, coverage areas, and verified reviews on MYSERVICE.');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const sampleMatch = SAMPLE_PROVIDERS.find((p) => p.id === id);
    if (sampleMatch) {
      setProvider(sampleMatch);
      setServices(SAMPLE_LISTINGS.filter((l) => l.providerId === id));
      setReviews([]);
      setLoading(false);
      return;
    }

    Promise.all([
      fetchProviderById(id),
      fetchActiveListings().catch(() => [] as ServiceListing[]),
      fetchPublishedReviewsForProvider(id),
    ])
      .then(([prov, allListings, revs]) => {
        setProvider(prov);
        setServices(allListings.filter((l) => l.providerId === id));
        setReviews(revs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#142B4A] mb-2">Provider not found</h1>
        <p className="text-sm text-slate-600 mb-6">This profile may have been suspended or removed.</p>
        <Link to="/professionals" className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
          Browse Professionals
        </Link>
      </div>
    );
  }

  const handleMessage = async () => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    if (provider.isSample) {
      navigate(`/post-job?category=${provider.categoryIds[0] || ''}`);
      return;
    }
    await getOrCreateConversation({
      customerId: firebaseUser.uid,
      customerName: userProfile?.displayName || firebaseUser.displayName || 'Customer',
      providerId: provider.userId,
      providerName: provider.businessName || provider.fullName,
      contextTitle: `Inquiry for ${provider.businessName || provider.fullName}`,
    });
    navigate('/dashboard?tab=messages');
  };

  const handleSave = async () => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    const next = await toggleSavedProvider({
      customerId: firebaseUser.uid,
      providerId: provider.id,
      providerName: provider.businessName || provider.fullName,
      district: provider.district,
    });
    setSaved(next);
    setFeedback(next ? 'Provider saved to your Customer Dashboard.' : 'Removed from saved providers.');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !bookingListing) {
      navigate('/login');
      return;
    }
    setBookingBusy(true);
    try {
      const settings = await fetchPublicAdminSettings();
      await createDirectBooking({
        listing: bookingListing,
        customerId: firebaseUser.uid,
        customerName: userProfile?.displayName || firebaseUser.displayName || 'Customer',
        scheduledDate: bookingDate,
        scheduledTime: bookingTime,
        commissionRatePct: settings.defaultCommissionPct,
      });
      setBookingListing(null);
      setFeedback('Booking request sent! Track status in Customer Dashboard -> My Bookings.');
    } finally {
      setBookingBusy(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || reportReason.trim().length < 5) return;
    await submitReportOrDispute({
      kind: 'report',
      reporterId: firebaseUser.uid,
      targetUserId: provider.userId,
      targetType: 'provider',
      details: reportReason.trim(),
    });
    setReportOpen(false);
    setReportReason('');
    setFeedback('Report submitted to MYSERVICE administrators.');
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {feedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row gap-5 items-start justify-between">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#EAF2FF] shrink-0 border border-slate-200">
              <SafeImage
                src={provider.photoURL}
                alt={provider.businessName || provider.fullName}
                className="w-full h-full object-cover"
                fallbackLabel={provider.fullName}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1.5">
                <span>{provider.city}, {provider.district}</span>
                <span aria-hidden="true">·</span>
                <span>{provider.yearsExperience} years experience</span>
                {provider.isSample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-700">Sample Demo Profile</span>
                  </>
                )}
                {provider.verificationStatus === 'verified' && !provider.isSample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Admin Verified
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A]">
                {provider.businessName || provider.fullName}
              </h1>
              {provider.businessName && (
                <p className="text-sm text-slate-500 mt-0.5">{provider.fullName}</p>
              )}
              <p className="text-sm text-slate-600 mt-3 max-w-2xl leading-relaxed">{provider.bio}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleMessage}
              className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {provider.isSample ? t('requestQuote') : t('messageProvider')}
            </button>
            {!provider.isSample && (
              <>
                <Link
                  to={`/post-job?category=${encodeURIComponent(provider.categoryIds?.[0] || '')}&district=${encodeURIComponent(provider.district)}&provider=${encodeURIComponent(provider.businessName || provider.fullName)}`}
                  className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#EAF2FF] text-[#2563EB] text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  {t('requestQuote')}
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-[#142B4A] hover:bg-[#F5F8FD]"
                >
                  <Bookmark className="w-4 h-4" />
                  {saved ? t('savedProvider') : t('saveProvider')}
                </button>
                <button
                  type="button"
                  onClick={() => (firebaseUser ? setReportOpen(true) : navigate('/login'))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-red-600"
                  title="Report Provider"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Details & Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#142B4A]">Coverage & Schedule</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#142B4A]">Service Coverage Districts</p>
                  <p>{provider.coverageDistricts.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#142B4A]">Working Days</p>
                  <p>{(provider.workingDays || ['Mon - Sat']).join(', ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#142B4A]">Available Hours</p>
                  <p>{provider.timeSlots || '08:00 AM - 06:00 PM'}</p>
                </div>
              </div>
              {provider.qualifications && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="font-semibold text-[#142B4A] mb-1">Qualifications</p>
                  <p>{provider.qualifications}</p>
                </div>
              )}
            </div>
          </div>

          {/* Services Offered */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#142B4A] mb-4">Published Services</h2>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No active service packages published yet. Send a message or post a job request for a custom quotation.
                </p>
              ) : (
                <div className="space-y-4">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          {srv.subcategory} · {srv.city}, {srv.district}
                          {srv.isSample ? ' · Sample Demo' : ''}
                        </p>
                        <h3 className="font-semibold text-[#142B4A]">{srv.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{srv.description}</p>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <span className="font-mono text-base font-bold text-[#142B4A] tabular-nums">
                          LKR {srv.priceLkr.toLocaleString()}
                        </span>
                        {srv.isSample ? (
                          <Link
                            to={`/post-job?category=${srv.categoryId}`}
                            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl bg-[#EAF2FF] text-[#2563EB] text-xs font-semibold hover:bg-blue-100 whitespace-nowrap"
                          >
                            {t('requestQuote')}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => (firebaseUser ? setBookingListing(srv) : navigate('/login'))}
                            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
                          >
                            {t('bookService')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Work Sample Photos (when uploaded by provider) */}
            {((provider.photoThumbnails && provider.photoThumbnails.length > 0) ||
              (provider.photoCaptions && provider.photoCaptions.length > 0)) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-[#142B4A] mb-3">Work Samples & Portfolio</h2>
                {provider.photoThumbnails && provider.photoThumbnails.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {provider.photoThumbnails.map((src, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-[#F5F8FD] aspect-square">
                        <img
                          src={src}
                          alt={provider.photoCaptions?.[i] || `Work sample ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {provider.photoCaptions && provider.photoCaptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {provider.photoCaptions.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#F5F8FD] border border-slate-200 text-xs text-slate-700"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Verified Reviews */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#142B4A] mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Customer Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No completed booking reviews yet. Reviews appear here only after customers complete a real booking.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-[#142B4A]">{rev.customerName}</span>
                        <span className="font-mono font-semibold text-amber-600">{rev.rating}/5 ★</span>
                      </div>
                      <p className="text-sm text-slate-600">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direct Booking Modal */}
        {bookingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
            <form
              onSubmit={handleConfirmBooking}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-[#142B4A]">Book Service</h3>
              <p className="text-sm text-slate-600">{bookingListing.title} · LKR {bookingListing.priceLkr.toLocaleString()}</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Time</label>
                <input
                  type="text"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingListing(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingBusy}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {bookingBusy ? 'Booking...' : 'Send Booking Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Report Modal */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
            <form
              onSubmit={handleReportSubmit}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-[#142B4A]">Report Provider Profile</h3>
              <textarea
                required
                minLength={5}
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe your concern for administrator review..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
