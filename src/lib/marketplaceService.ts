import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../data/sampleCatalog';
import {
  AdminSettings,
  AuditLog,
  Booking,
  CommissionRecord,
  Conversation,
  DisputeItem,
  FeaturedListing,
  JobPrivateAddress,
  JobRequest,
  MessageItem,
  NotificationItem,
  PaymentRecord,
  ProviderProfile,
  ProviderVerification,
  Quotation,
  ReportItem,
  ReviewItem,
  SavedProvider,
  ServiceCategory,
  ServiceListing,
  SubscriptionPlan,
  SubscriptionRecord,
  UserPrivateContact,
  UserProfile,
  VerificationStatus,
} from '../types/marketplace';
import { db, handleFirestoreError, OperationType } from './firebase';

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function cleanStr(val: string | undefined, max: number): string {
  return (val || '').trim().slice(0, max);
}

function cleanThumbnails(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v) => typeof v === 'string' && v.length > 0 && v.length <= 48000)
    .slice(0, 3);
}

function cleanCaptions(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => cleanStr(v, 120))
    .filter((v) => v.length > 0)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Catalog & Settings Readers
// ---------------------------------------------------------------------------
export async function fetchActiveCategories(): Promise<ServiceCategory[]> {
  try {
    const q = query(collection(db, 'serviceCategories'), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return DEFAULT_CATEGORIES;
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceCategory, 'id'>) }));
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function fetchAllCategoriesAdmin(): Promise<ServiceCategory[]> {
  try {
    const snap = await getDocs(collection(db, 'serviceCategories'));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceCategory, 'id'>) }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'serviceCategories');
  }
}

export async function fetchActiveListings(): Promise<ServiceListing[]> {
  try {
    const q = query(collection(db, 'serviceListings'), where('isActive', '==', true), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceListing, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'serviceListings');
  }
}

export async function fetchPublicProviders(): Promise<ProviderProfile[]> {
  try {
    const q = query(
      collection(db, 'providerProfiles'),
      where('verificationStatus', 'in', ['verified', 'pending_review', 'not_submitted', 'rejected']),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProviderProfile, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'providerProfiles');
  }
}

export async function fetchProviderById(providerId: string): Promise<ProviderProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'providerProfiles', providerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<ProviderProfile, 'id'>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `providerProfiles/${providerId}`);
  }
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const q = query(collection(db, 'subscriptionPlans'), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return DEFAULT_SUBSCRIPTION_PLANS;
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubscriptionPlan, 'id'>) }));
  } catch {
    return DEFAULT_SUBSCRIPTION_PLANS;
  }
}

export async function fetchPublicAdminSettings(): Promise<AdminSettings> {
  try {
    const snap = await getDoc(doc(db, 'adminSettings', 'global'));
    if (!snap.exists()) {
      return {
        id: 'global',
        defaultCommissionPct: 10,
        announcement_en: 'Launching across Western Province · All 25 Sri Lankan districts supported.',
        announcement_si: 'බස්නාහිර පළාතෙන් ආරම්භය · දිස්ත්‍රික්ක 25 පුරාම සහය දක්වයි.',
        announcement_ta: 'மேல் மாகாணத்தில் தொடக்கம் · அனைத்து 25 மாவட்டங்களும் ஆதரிக்கப்படுகின்றன.',
        supportEmail: 'support@myservice.lk',
        supportPhone: '+94 11 000 0000',
        isPublic: true,
      };
    }
    return snap.data() as AdminSettings;
  } catch {
    return {
      id: 'global',
      defaultCommissionPct: 10,
      supportEmail: 'support@myservice.lk',
      supportPhone: '+94 11 000 0000',
      isPublic: true,
    };
  }
}

export async function fetchPublishedReviewsForProvider(providerId: string): Promise<ReviewItem[]> {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
      where('isPublished', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewItem, 'id'>) }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// User Profile & Private Contact
// ---------------------------------------------------------------------------
export async function updateUserProfileAndContact(
  currentUser: UserProfile,
  updates: {
    displayName: string;
    preferredLanguage: 'en' | 'si' | 'ta';
    province: string;
    district: string;
    city: string;
    email: string;
    phone: string;
    privateAddress: string;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName: cleanStr(updates.displayName, 100) || currentUser.displayName,
      photoURL: cleanStr(currentUser.photoURL, 500),
      preferredLanguage: updates.preferredLanguage,
      province: cleanStr(updates.province, 60),
      district: cleanStr(updates.district, 60),
      city: cleanStr(updates.city, 80),
      providerStatus: currentUser.providerStatus,
      accountStatus: currentUser.accountStatus,
      createdAt: currentUser.createdAt,
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', currentUser.uid, 'private', 'contact'), {
      uid: currentUser.uid,
      email: cleanStr(updates.email, 160),
      phone: cleanStr(updates.phone, 30),
      privateAddress: cleanStr(updates.privateAddress, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
  }
}

// ---------------------------------------------------------------------------
// Provider Registration & Listings
// ---------------------------------------------------------------------------
export async function submitProviderOnboarding(params: {
  uid: string;
  userProfile: UserProfile;
  fullName: string;
  businessName: string;
  photoURL: string;
  email: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  categoryIds: string[];
  subcategories: string[];
  coverageDistricts: string[];
  yearsExperience: number;
  bio: string;
  qualifications: string;
  startingPriceLkr: number;
  workingDays: string[];
  timeSlots: string;
  portfolioUrls: string[];
  photoThumbnails?: string[];
  photoCaptions?: string[];
  nicOrRegNumber: string;
  certificateSummary: string;
  documentNames: string[];
}): Promise<void> {
  const { uid, userProfile } = params;
  const safeThumbnails = cleanThumbnails(params.photoThumbnails);
  const safeCaptions = cleanCaptions(params.photoCaptions);
  try {
    const existingProvider = await getDoc(doc(db, 'providerProfiles', uid));
    if (existingProvider.exists()) {
      const existingData = existingProvider.data() as ProviderProfile;
      await updateDoc(doc(db, 'providerProfiles', uid), {
        userId: uid,
        fullName: cleanStr(params.fullName, 100),
        businessName: cleanStr(params.businessName, 120),
        photoURL: cleanStr(params.photoURL, 500),
        province: cleanStr(params.province, 60),
        district: cleanStr(params.district, 60),
        city: cleanStr(params.city, 80),
        categoryIds: params.categoryIds.slice(0, 10),
        subcategories: params.subcategories.slice(0, 20),
        coverageDistricts: params.coverageDistricts.slice(0, 25),
        yearsExperience: Math.max(0, Math.min(80, Number(params.yearsExperience) || 0)),
        bio: cleanStr(params.bio, 1500),
        qualifications: cleanStr(params.qualifications, 600),
        startingPriceLkr: Math.max(0, Number(params.startingPriceLkr) || 0),
        workingDays: params.workingDays.slice(0, 7),
        timeSlots: cleanStr(params.timeSlots, 160),
        portfolioUrls: params.portfolioUrls.slice(0, 8),
        photoThumbnails: safeThumbnails.length > 0 ? safeThumbnails : (existingData.photoThumbnails || []),
        photoCaptions: safeCaptions.length > 0 ? safeCaptions : (existingData.photoCaptions || []),
        verificationStatus: existingData.verificationStatus === 'rejected' ? 'pending_review' : existingData.verificationStatus,
        createdAt: existingData.createdAt,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'providerProfiles', uid), {
        userId: uid,
        fullName: cleanStr(params.fullName, 100),
        businessName: cleanStr(params.businessName, 120),
        photoURL: cleanStr(params.photoURL, 500),
        province: cleanStr(params.province, 60),
        district: cleanStr(params.district, 60),
        city: cleanStr(params.city, 80),
        categoryIds: params.categoryIds.slice(0, 10),
        subcategories: params.subcategories.slice(0, 20),
        coverageDistricts: params.coverageDistricts.slice(0, 25),
        yearsExperience: Math.max(0, Math.min(80, Number(params.yearsExperience) || 0)),
        bio: cleanStr(params.bio, 1500),
        qualifications: cleanStr(params.qualifications, 600),
        startingPriceLkr: Math.max(0, Number(params.startingPriceLkr) || 0),
        workingDays: params.workingDays.slice(0, 7),
        timeSlots: cleanStr(params.timeSlots, 160),
        portfolioUrls: params.portfolioUrls.slice(0, 8),
        ...(safeThumbnails.length > 0 ? { photoThumbnails: safeThumbnails } : {}),
        ...(safeCaptions.length > 0 ? { photoCaptions: safeCaptions } : {}),
        verificationStatus: 'pending_review',
        ratingAvg: 0,
        reviewCount: 0,
        subscriptionPlanId: 'free',
        isSample: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const existingVerif = await getDoc(doc(db, 'providerVerification', uid));
    if (!existingVerif.exists()) {
      await setDoc(doc(db, 'providerVerification', uid), {
        providerId: uid,
        email: cleanStr(params.email, 160),
        phone: cleanStr(params.phone, 30),
        nicOrRegNumber: cleanStr(params.nicOrRegNumber, 60),
        certificateSummary: cleanStr(params.certificateSummary, 500),
        documentNames: params.documentNames.slice(0, 10),
        status: 'pending_review',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (existingVerif.data()?.status === 'rejected') {
      await updateDoc(doc(db, 'providerVerification', uid), {
        providerId: uid,
        email: cleanStr(params.email, 160),
        phone: cleanStr(params.phone, 30),
        nicOrRegNumber: cleanStr(params.nicOrRegNumber, 60),
        certificateSummary: cleanStr(params.certificateSummary, 500),
        documentNames: params.documentNames.slice(0, 10),
        status: 'pending_review',
        submittedAt: existingVerif.data().submittedAt,
        updatedAt: serverTimestamp(),
      });
    }

    if (userProfile.providerStatus === 'not_submitted' || userProfile.providerStatus === 'rejected') {
      await updateDoc(doc(db, 'users', uid), {
        uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
        preferredLanguage: userProfile.preferredLanguage,
        province: userProfile.province || 'Western',
        district: userProfile.district || 'Colombo',
        city: userProfile.city || '',
        providerStatus: 'pending_review',
        accountStatus: userProfile.accountStatus,
        createdAt: userProfile.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `providerProfiles/${uid}`);
  }
}

export async function createServiceListing(
  provider: ProviderProfile,
  payload: {
    title: string;
    categoryId: string;
    subcategory: string;
    description: string;
    province: string;
    district: string;
    city: string;
    coverageDistricts: string[];
    priceLkr: number;
    priceUnit: string;
    imageUrl?: string;
  }
): Promise<string> {
  const id = makeSafeId('srv');
  try {
    await setDoc(doc(db, 'serviceListings', id), {
      providerId: provider.userId,
      providerName: cleanStr(provider.businessName || provider.fullName, 100),
      providerVerified: provider.verificationStatus === 'verified',
      title: cleanStr(payload.title, 120),
      categoryId: cleanStr(payload.categoryId, 64),
      subcategory: cleanStr(payload.subcategory, 80),
      description: cleanStr(payload.description, 1500),
      province: cleanStr(payload.province, 60),
      district: cleanStr(payload.district, 60),
      city: cleanStr(payload.city, 80),
      coverageDistricts: payload.coverageDistricts.slice(0, 25),
      priceLkr: Math.max(0, Number(payload.priceLkr) || 0),
      priceUnit: cleanStr(payload.priceUnit, 40) || 'per service',
      imageUrl: cleanStr(payload.imageUrl, 300),
      ratingAvg: 0,
      reviewCount: 0,
      isFeatured: false,
      isSample: false,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `serviceListings/${id}`);
  }
}

export async function updateServiceListing(
  existing: ServiceListing,
  updates: Partial<ServiceListing>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'serviceListings', existing.id), {
      providerId: existing.providerId,
      providerName: existing.providerName,
      providerVerified: existing.providerVerified ?? false,
      title: cleanStr(updates.title ?? existing.title, 120),
      categoryId: cleanStr(updates.categoryId ?? existing.categoryId, 64),
      subcategory: cleanStr(updates.subcategory ?? existing.subcategory, 80),
      description: cleanStr(updates.description ?? existing.description, 1500),
      province: cleanStr(updates.province ?? existing.province, 60),
      district: cleanStr(updates.district ?? existing.district, 60),
      city: cleanStr(updates.city ?? existing.city, 80),
      coverageDistricts: (updates.coverageDistricts ?? existing.coverageDistricts).slice(0, 25),
      priceLkr: Math.max(0, Number(updates.priceLkr ?? existing.priceLkr) || 0),
      priceUnit: cleanStr(updates.priceUnit ?? existing.priceUnit, 40),
      imageUrl: cleanStr(updates.imageUrl ?? existing.imageUrl, 300),
      isActive: updates.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `serviceListings/${existing.id}`);
  }
}

export async function deleteServiceListing(listingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'serviceListings', listingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `serviceListings/${listingId}`);
  }
}

// ---------------------------------------------------------------------------
// Job Requests, Quotations & Bookings
// ---------------------------------------------------------------------------
export async function createJobRequest(params: {
  customerId: string;
  customerName: string;
  title: string;
  categoryId: string;
  subcategory: string;
  description: string;
  province: string;
  district: string;
  city: string;
  exactAddress: string;
  contactPhone: string;
  preferredDate: string;
  preferredTime: string;
  budgetMinLkr: number;
  budgetMaxLkr: number;
  instructions: string;
  photoThumbnails?: string[];
  photoCaptions?: string[];
}): Promise<string> {
  const jobId = makeSafeId('job');
  const safeThumbnails = cleanThumbnails(params.photoThumbnails);
  const safeCaptions = cleanCaptions(params.photoCaptions);
  try {
    await setDoc(doc(db, 'jobRequests', jobId), {
      customerId: params.customerId,
      customerName: cleanStr(params.customerName, 100),
      title: cleanStr(params.title, 140),
      categoryId: cleanStr(params.categoryId, 64),
      subcategory: cleanStr(params.subcategory, 80),
      description: cleanStr(params.description, 2000),
      province: cleanStr(params.province, 60),
      district: cleanStr(params.district, 60),
      city: cleanStr(params.city, 80),
      preferredDate: cleanStr(params.preferredDate, 30),
      preferredTime: cleanStr(params.preferredTime, 40),
      budgetMinLkr: Math.max(0, Number(params.budgetMinLkr) || 0),
      budgetMaxLkr: Math.max(0, Number(params.budgetMaxLkr) || 0),
      instructions: cleanStr(params.instructions, 600),
      ...(safeThumbnails.length > 0 ? { photoThumbnails: safeThumbnails } : {}),
      ...(safeCaptions.length > 0 ? { photoCaptions: safeCaptions } : {}),
      status: 'open',
      quotationCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'jobRequests', jobId, 'private', 'address'), {
      jobId,
      customerId: params.customerId,
      exactAddress: cleanStr(params.exactAddress, 300) || `${params.city}, ${params.district}`,
      contactPhone: cleanStr(params.contactPhone, 30),
      updatedAt: serverTimestamp(),
    });

    // Notify matching real providers in the same category and district
    try {
      const provQ = query(
        collection(db, 'providerProfiles'),
        where('categoryIds', 'array-contains', params.categoryId),
        limit(20)
      );
      const provSnap = await getDocs(provQ);
      for (const pDoc of provSnap.docs) {
        const p = pDoc.data() as ProviderProfile;
        if (
          p.userId !== params.customerId &&
          p.verificationStatus !== 'suspended' &&
          (p.coverageDistricts?.includes(params.district) || p.district === params.district)
        ) {
          await createNotification({
            userId: p.userId,
            type: 'new_job',
            title: `New Job in ${params.district}: ${cleanStr(params.title, 80)}`,
            body: `A customer in ${params.city}, ${params.district} is requesting ${params.subcategory}.`,
            linkPath: '/provider-dashboard',
          });
        }
      }
    } catch {
      // non-fatal notification matching
    }

    return jobId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `jobRequests/${jobId}`);
  }
}

export async function updateJobRequest(
  existing: JobRequest,
  updates: Partial<JobRequest>
): Promise<void> {
  const safeThumbnails = cleanThumbnails(updates.photoThumbnails ?? existing.photoThumbnails);
  const safeCaptions = cleanCaptions(updates.photoCaptions ?? existing.photoCaptions);
  try {
    await updateDoc(doc(db, 'jobRequests', existing.id), {
      customerId: existing.customerId,
      customerName: existing.customerName,
      title: cleanStr(updates.title ?? existing.title, 140),
      categoryId: cleanStr(updates.categoryId ?? existing.categoryId, 64),
      subcategory: cleanStr(updates.subcategory ?? existing.subcategory, 80),
      description: cleanStr(updates.description ?? existing.description, 2000),
      province: cleanStr(updates.province ?? existing.province, 60),
      district: cleanStr(updates.district ?? existing.district, 60),
      city: cleanStr(updates.city ?? existing.city, 80),
      preferredDate: cleanStr(updates.preferredDate ?? existing.preferredDate, 30),
      preferredTime: cleanStr(updates.preferredTime ?? existing.preferredTime, 40),
      budgetMinLkr: updates.budgetMinLkr ?? existing.budgetMinLkr ?? 0,
      budgetMaxLkr: updates.budgetMaxLkr ?? existing.budgetMaxLkr ?? 0,
      instructions: cleanStr(updates.instructions ?? existing.instructions, 600),
      ...(safeThumbnails.length > 0 ? { photoThumbnails: safeThumbnails } : {}),
      ...(safeCaptions.length > 0 ? { photoCaptions: safeCaptions } : {}),
      status: updates.status ?? existing.status,
      assignedProviderId: updates.assignedProviderId ?? existing.assignedProviderId ?? '',
      createdAt: existing.createdAt,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobRequests/${existing.id}`);
  }
}

export async function fetchJobPrivateAddress(jobId: string): Promise<JobPrivateAddress | null> {
  try {
    const snap = await getDoc(doc(db, 'jobRequests', jobId, 'private', 'address'));
    return snap.exists() ? (snap.data() as JobPrivateAddress) : null;
  } catch {
    return null;
  }
}

export async function submitQuotation(params: {
  job: JobRequest;
  provider: ProviderProfile;
  amountLkr: number;
  estimatedDuration: string;
  notes: string;
}): Promise<string> {
  const quotationId = makeSafeId('qt');
  try {
    await setDoc(doc(db, 'quotations', quotationId), {
      jobId: params.job.id,
      jobTitle: cleanStr(params.job.title, 140),
      customerId: params.job.customerId,
      providerId: params.provider.userId,
      providerName: cleanStr(params.provider.businessName || params.provider.fullName, 100),
      providerVerified: params.provider.verificationStatus === 'verified',
      amountLkr: Math.max(1, Number(params.amountLkr) || 0),
      estimatedDuration: cleanStr(params.estimatedDuration, 80),
      notes: cleanStr(params.notes, 1000),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const { id: _jobId, ...jobRest } = params.job;
    await updateDoc(doc(db, 'jobRequests', params.job.id), {
      ...jobRest,
      status: 'quoted',
      quotationCount: (params.job.quotationCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      userId: params.job.customerId,
      type: 'new_quotation',
      title: `New Quotation: LKR ${Number(params.amountLkr).toLocaleString()}`,
      body: `${params.provider.businessName || params.provider.fullName} quoted on "${cleanStr(params.job.title, 60)}".`,
      linkPath: '/dashboard',
    });

    return quotationId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `quotations/${quotationId}`);
  }
}

export async function acceptQuotation(
  quotation: Quotation,
  job: JobRequest,
  customerName: string,
  commissionRatePct: number
): Promise<string> {
  const bookingId = makeSafeId('bk');
  const commId = makeSafeId('cm');
  const commissionLkr = Math.round((quotation.amountLkr * commissionRatePct) / 100);
  const netProviderLkr = Math.max(0, quotation.amountLkr - commissionLkr);

  try {
    await updateDoc(doc(db, 'quotations', quotation.id), {
      jobId: quotation.jobId,
      jobTitle: quotation.jobTitle,
      customerId: quotation.customerId,
      providerId: quotation.providerId,
      providerName: quotation.providerName,
      providerVerified: quotation.providerVerified ?? false,
      amountLkr: quotation.amountLkr,
      estimatedDuration: quotation.estimatedDuration,
      notes: quotation.notes || '',
      status: 'accepted',
      createdAt: quotation.createdAt,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'jobRequests', job.id), {
      customerId: job.customerId,
      customerName: job.customerName,
      title: job.title,
      categoryId: job.categoryId,
      subcategory: job.subcategory,
      description: job.description,
      province: job.province,
      district: job.district,
      city: job.city,
      preferredDate: job.preferredDate,
      preferredTime: job.preferredTime || '',
      budgetMinLkr: job.budgetMinLkr ?? 0,
      budgetMaxLkr: job.budgetMaxLkr ?? 0,
      instructions: job.instructions || '',
      ...(Array.isArray(job.photoThumbnails) && job.photoThumbnails.length > 0 ? { photoThumbnails: job.photoThumbnails } : {}),
      ...(Array.isArray(job.photoCaptions) && job.photoCaptions.length > 0 ? { photoCaptions: job.photoCaptions } : {}),
      status: 'assigned',
      assignedProviderId: quotation.providerId,
      createdAt: job.createdAt,
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'bookings', bookingId), {
      jobId: job.id,
      quotationId: quotation.id,
      customerId: quotation.customerId,
      customerName: cleanStr(customerName, 100),
      providerId: quotation.providerId,
      providerName: quotation.providerName,
      serviceTitle: cleanStr(job.title, 140),
      district: job.district,
      city: job.city,
      scheduledDate: job.preferredDate,
      scheduledTime: job.preferredTime || 'Flexible',
      amountLkr: quotation.amountLkr,
      commissionRatePct,
      commissionLkr,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      reviewSubmitted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'commissionRecords', commId), {
      bookingId,
      providerId: quotation.providerId,
      customerId: quotation.customerId,
      grossAmountLkr: quotation.amountLkr,
      commissionRatePct,
      commissionAmountLkr: commissionLkr,
      netProviderLkr,
      status: 'recorded',
      createdAt: serverTimestamp(),
    });

    await createNotification({
      userId: quotation.providerId,
      type: 'quotation_accepted',
      title: `Quotation Accepted: ${cleanStr(job.title, 60)}`,
      body: `${customerName} accepted your LKR ${quotation.amountLkr.toLocaleString()} quotation. Booking confirmed.`,
      linkPath: '/provider-dashboard',
    });

    return bookingId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bookings/${bookingId}`);
  }
}

export async function rejectQuotation(quotation: Quotation): Promise<void> {
  try {
    await updateDoc(doc(db, 'quotations', quotation.id), {
      jobId: quotation.jobId,
      jobTitle: quotation.jobTitle,
      customerId: quotation.customerId,
      providerId: quotation.providerId,
      providerName: quotation.providerName,
      providerVerified: quotation.providerVerified ?? false,
      amountLkr: quotation.amountLkr,
      estimatedDuration: quotation.estimatedDuration,
      notes: quotation.notes || '',
      status: 'rejected',
      createdAt: quotation.createdAt,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `quotations/${quotation.id}`);
  }
}

export async function createDirectBooking(params: {
  listing: ServiceListing;
  customerId: string;
  customerName: string;
  scheduledDate: string;
  scheduledTime: string;
  commissionRatePct: number;
}): Promise<string> {
  const bookingId = makeSafeId('bk');
  const commId = makeSafeId('cm');
  const { listing } = params;
  const commissionLkr = Math.round((listing.priceLkr * params.commissionRatePct) / 100);
  const netProviderLkr = Math.max(0, listing.priceLkr - commissionLkr);

  try {
    await setDoc(doc(db, 'bookings', bookingId), {
      listingId: listing.id,
      customerId: params.customerId,
      customerName: cleanStr(params.customerName, 100),
      providerId: listing.providerId,
      providerName: listing.providerName,
      serviceTitle: cleanStr(listing.title, 140),
      district: listing.district,
      city: listing.city,
      scheduledDate: cleanStr(params.scheduledDate, 30),
      scheduledTime: cleanStr(params.scheduledTime, 40),
      amountLkr: listing.priceLkr,
      commissionRatePct: params.commissionRatePct,
      commissionLkr,
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      reviewSubmitted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'commissionRecords', commId), {
      bookingId,
      providerId: listing.providerId,
      customerId: params.customerId,
      grossAmountLkr: listing.priceLkr,
      commissionRatePct: params.commissionRatePct,
      commissionAmountLkr: commissionLkr,
      netProviderLkr,
      status: 'recorded',
      createdAt: serverTimestamp(),
    });

    await createNotification({
      userId: listing.providerId,
      type: 'new_booking',
      title: `New Booking Request: ${cleanStr(listing.title, 60)}`,
      body: `${params.customerName} requested a booking for ${params.scheduledDate}.`,
      linkPath: '/provider-dashboard',
    });

    return bookingId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
  }
}

export async function updateBookingStatus(
  booking: Booking,
  newStatus: Booking['status']
): Promise<void> {
  try {
    await updateDoc(doc(db, 'bookings', booking.id), {
      jobId: booking.jobId || '',
      quotationId: booking.quotationId || '',
      listingId: booking.listingId || '',
      customerId: booking.customerId,
      customerName: booking.customerName,
      providerId: booking.providerId,
      providerName: booking.providerName,
      serviceTitle: booking.serviceTitle,
      district: booking.district,
      city: booking.city,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime || '',
      amountLkr: booking.amountLkr,
      commissionRatePct: booking.commissionRatePct ?? 0,
      commissionLkr: booking.commissionLkr ?? 0,
      status: newStatus,
      paymentStatus: booking.paymentStatus,
      reviewSubmitted: booking.reviewSubmitted ?? false,
      createdAt: booking.createdAt,
      updatedAt: serverTimestamp(),
    });

    const recipientId = newStatus === 'cancelled' ? booking.providerId : booking.customerId;
    await createNotification({
      userId: recipientId,
      type: 'booking_update',
      title: `Booking ${newStatus.replace('_', ' ')}`,
      body: `${booking.serviceTitle} status updated to ${newStatus.replace('_', ' ')}.`,
      linkPath: recipientId === booking.customerId ? '/dashboard' : '/provider-dashboard',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function submitBookingReview(params: {
  booking: Booking;
  rating: number;
  comment: string;
}): Promise<void> {
  const reviewId = makeSafeId('rev');
  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      bookingId: params.booking.id,
      customerId: params.booking.customerId,
      customerName: params.booking.customerName,
      providerId: params.booking.providerId,
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      comment: cleanStr(params.comment, 1000),
      isPublished: true,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'bookings', params.booking.id), {
      jobId: params.booking.jobId || '',
      quotationId: params.booking.quotationId || '',
      listingId: params.booking.listingId || '',
      customerId: params.booking.customerId,
      customerName: params.booking.customerName,
      providerId: params.booking.providerId,
      providerName: params.booking.providerName,
      serviceTitle: params.booking.serviceTitle,
      district: params.booking.district,
      city: params.booking.city,
      scheduledDate: params.booking.scheduledDate,
      scheduledTime: params.booking.scheduledTime || '',
      amountLkr: params.booking.amountLkr,
      commissionRatePct: params.booking.commissionRatePct ?? 0,
      commissionLkr: params.booking.commissionLkr ?? 0,
      status: 'completed',
      paymentStatus: params.booking.paymentStatus,
      reviewSubmitted: true,
      createdAt: params.booking.createdAt,
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      userId: params.booking.providerId,
      type: 'new_review',
      title: `New ${params.rating}-Star Review Received`,
      body: `${params.booking.customerName} reviewed your completed service.`,
      linkPath: '/provider-dashboard',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
  }
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------
export async function getOrCreateConversation(params: {
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  contextTitle: string;
}): Promise<string> {
  const convId = `conv_${params.customerId}_${params.providerId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  try {
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (!snap.exists()) {
      await setDoc(doc(db, 'conversations', convId), {
        customerId: params.customerId,
        customerName: cleanStr(params.customerName, 100),
        providerId: params.providerId,
        providerName: cleanStr(params.providerName, 100),
        contextTitle: cleanStr(params.contextTitle, 140),
        lastMessage: '',
        lastSenderId: '',
        unreadByCustomer: false,
        unreadByProvider: false,
        updatedAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
  }
}

export async function sendChatMessage(params: {
  conversation: Conversation;
  senderId: string;
  senderName: string;
  text: string;
}): Promise<void> {
  const msgId = makeSafeId('msg');
  const trimmed = cleanStr(params.text, 2000);
  if (!trimmed) return;
  try {
    await setDoc(doc(db, 'conversations', params.conversation.id, 'messages', msgId), {
      conversationId: params.conversation.id,
      senderId: params.senderId,
      senderName: cleanStr(params.senderName, 100),
      text: trimmed,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const isCustomer = params.senderId === params.conversation.customerId;
    await updateDoc(doc(db, 'conversations', params.conversation.id), {
      customerId: params.conversation.customerId,
      customerName: params.conversation.customerName,
      providerId: params.conversation.providerId,
      providerName: params.conversation.providerName,
      contextTitle: params.conversation.contextTitle,
      lastMessage: trimmed.slice(0, 300),
      lastSenderId: params.senderId,
      unreadByCustomer: !isCustomer,
      unreadByProvider: isCustomer,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${params.conversation.id}/messages/${msgId}`);
  }
}

// ---------------------------------------------------------------------------
// Notifications & Saved Providers & Contact
// ---------------------------------------------------------------------------
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkPath?: string;
}): Promise<void> {
  const id = makeSafeId('ntf');
  try {
    await setDoc(doc(db, 'notifications', id), {
      userId: params.userId,
      type: cleanStr(params.type, 40),
      title: cleanStr(params.title, 140),
      body: cleanStr(params.body, 400),
      linkPath: cleanStr(params.linkPath, 160),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // non-fatal notification failure
  }
}

export async function markNotificationRead(notif: NotificationItem): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notif.id), {
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      linkPath: notif.linkPath || '',
      isRead: true,
      createdAt: notif.createdAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notif.id}`);
  }
}

export async function toggleSavedProvider(params: {
  customerId: string;
  providerId: string;
  providerName: string;
  district?: string;
  currentlySavedId?: string;
}): Promise<boolean> {
  try {
    if (params.currentlySavedId) {
      await deleteDoc(doc(db, 'savedProviders', params.currentlySavedId));
      return false;
    }
    const id = `save_${params.customerId}_${params.providerId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    await setDoc(doc(db, 'savedProviders', id), {
      customerId: params.customerId,
      providerId: params.providerId,
      providerName: cleanStr(params.providerName, 100),
      district: cleanStr(params.district, 60),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'savedProviders');
  }
}

export async function submitContactMessage(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const id = makeSafeId('cnt');
  try {
    await setDoc(doc(db, 'contactMessages', id), {
      name: cleanStr(params.name, 100),
      email: cleanStr(params.email, 160),
      subject: cleanStr(params.subject, 160),
      message: cleanStr(params.message, 2000),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contactMessages/${id}`);
  }
}

export async function submitReportOrDispute(params: {
  kind: 'report' | 'dispute';
  reporterId: string;
  targetUserId: string;
  bookingId?: string;
  targetType?: 'provider' | 'customer' | 'listing' | 'review';
  details: string;
}): Promise<void> {
  const id = makeSafeId(params.kind === 'report' ? 'rep' : 'dsp');
  try {
    if (params.kind === 'report') {
      await setDoc(doc(db, 'reports', id), {
        reporterId: params.reporterId,
        targetUserId: params.targetUserId,
        targetType: params.targetType || 'provider',
        reason: cleanStr(params.details, 600),
        status: 'open',
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'disputes', id), {
        bookingId: params.bookingId || 'general',
        reporterId: params.reporterId,
        targetUserId: params.targetUserId,
        summary: cleanStr(params.details, 800),
        status: 'open',
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${params.kind}s/${id}`);
  }
}

// ---------------------------------------------------------------------------
// Payments & Subscriptions (Server-verified PayHere Sandbox Demo)
// ---------------------------------------------------------------------------
export async function recordVerifiedSandboxPayment(params: {
  uid: string;
  paymentType: 'booking' | 'subscription' | 'featured_listing';
  referenceId: string;
  amountLkr: number;
  transactionRef: string;
  gatewayMode: 'payhere_sandbox_demo' | 'payhere_live';
  booking?: Booking;
  plan?: SubscriptionPlan;
  billingCycle?: 'monthly' | 'yearly';
}): Promise<void> {
  const paymentId = makeSafeId('pay');
  try {
    await setDoc(doc(db, 'paymentRecords', paymentId), {
      userId: params.uid,
      paymentType: params.paymentType,
      referenceId: params.referenceId,
      amountLkr: params.amountLkr,
      currency: 'LKR',
      transactionRef: params.transactionRef,
      gatewayMode: params.gatewayMode,
      status: 'demo_verified',
      refundStatus: 'none',
      createdAt: serverTimestamp(),
    });

    if (params.paymentType === 'booking' && params.booking) {
      await updateDoc(doc(db, 'bookings', params.booking.id), {
        jobId: params.booking.jobId || '',
        quotationId: params.booking.quotationId || '',
        listingId: params.booking.listingId || '',
        customerId: params.booking.customerId,
        customerName: params.booking.customerName,
        providerId: params.booking.providerId,
        providerName: params.booking.providerName,
        serviceTitle: params.booking.serviceTitle,
        district: params.booking.district,
        city: params.booking.city,
        scheduledDate: params.booking.scheduledDate,
        scheduledTime: params.booking.scheduledTime || '',
        amountLkr: params.booking.amountLkr,
        commissionRatePct: params.booking.commissionRatePct ?? 0,
        commissionLkr: params.booking.commissionLkr ?? 0,
        status: params.booking.status,
        paymentStatus: 'demo_paid',
        reviewSubmitted: params.booking.reviewSubmitted ?? false,
        createdAt: params.booking.createdAt,
        updatedAt: serverTimestamp(),
      });
    }

    if (params.paymentType === 'subscription' && params.plan) {
      const subId = makeSafeId('sub');
      const days = params.billingCycle === 'yearly' ? 365 : params.plan.durationDays;
      const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      await setDoc(doc(db, 'subscriptions', subId), {
        providerId: params.uid,
        planId: params.plan.id,
        planName: params.plan.name,
        billingCycle: params.billingCycle || 'monthly',
        amountLkr: params.amountLkr,
        status: 'active',
        paymentMode: params.gatewayMode,
        expiresAt,
        createdAt: serverTimestamp(),
      });
    }

    if (params.paymentType === 'featured_listing') {
      const featId = makeSafeId('feat');
      await setDoc(doc(db, 'featuredListings', featId), {
        listingId: params.referenceId,
        providerId: params.uid,
        title: `Featured Promotion (${params.referenceId})`,
        isActive: true,
        expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `paymentRecords/${paymentId}`);
  }
}

export async function activateFreeSubscription(uid: string, plan: SubscriptionPlan): Promise<void> {
  const subId = makeSafeId('sub');
  try {
    await setDoc(doc(db, 'subscriptions', subId), {
      providerId: uid,
      planId: plan.id,
      planName: plan.name,
      billingCycle: 'free',
      amountLkr: 0,
      status: 'active',
      paymentMode: 'free',
      expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `subscriptions/${subId}`);
  }
}

// ---------------------------------------------------------------------------
// Admin Operations & Audit Logging
// ---------------------------------------------------------------------------
export async function logAdminAction(params: {
  actorUid: string;
  actorEmail?: string;
  action: string;
  targetPath: string;
  details: string;
}): Promise<void> {
  const id = makeSafeId('log');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid: params.actorUid,
      actorEmail: cleanStr(params.actorEmail, 160),
      action: cleanStr(params.action, 120),
      targetPath: cleanStr(params.targetPath, 200),
      details: cleanStr(params.details, 500),
      createdAt: serverTimestamp(),
    });
  } catch {
    // audit log best-effort
  }
}

export async function adminReviewProvider(params: {
  adminUid: string;
  adminEmail: string;
  provider: ProviderProfile;
  decision: VerificationStatus;
  notes: string;
}): Promise<void> {
  const { provider, decision, notes, adminUid, adminEmail } = params;
  const { id: _provId, ...providerRest } = provider;
  try {
    await updateDoc(doc(db, 'providerProfiles', provider.id), {
      ...providerRest,
      verificationStatus: decision,
      rejectionReason: cleanStr(notes, 400),
      updatedAt: serverTimestamp(),
    });

    const verifRef = doc(db, 'providerVerification', provider.id);
    const verifSnap = await getDoc(verifRef);
    if (verifSnap.exists()) {
      const vd = verifSnap.data() as ProviderVerification;
      await updateDoc(verifRef, {
        providerId: vd.providerId,
        email: vd.email,
        phone: vd.phone,
        nicOrRegNumber: vd.nicOrRegNumber,
        certificateSummary: vd.certificateSummary || '',
        documentNames: vd.documentNames || [],
        status: decision === 'not_submitted' ? 'pending_review' : decision,
        reviewNotes: cleanStr(notes, 500),
        reviewedBy: adminUid,
        submittedAt: vd.submittedAt,
        updatedAt: serverTimestamp(),
      });
    }

    const userRef = doc(db, 'users', provider.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const ud = userSnap.data() as UserProfile;
      await updateDoc(userRef, {
        ...ud,
        providerStatus: decision,
        updatedAt: serverTimestamp(),
      });
    }

    await createNotification({
      userId: provider.userId,
      type: 'verification_update',
      title: `Provider Verification: ${decision.replace('_', ' ')}`,
      body: notes || `Your provider verification status was updated to ${decision}.`,
      linkPath: '/provider-dashboard',
    });

    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: `provider_verification_${decision}`,
      targetPath: `providerProfiles/${provider.id}`,
      details: notes || `Updated verification status to ${decision}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `providerProfiles/${provider.id}`);
  }
}

export async function adminSyncDefaultCatalog(adminUid: string, adminEmail: string): Promise<void> {
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      await setDoc(doc(db, 'serviceCategories', cat.id), {
        id: cat.id,
        slug: cat.slug,
        name_en: cat.name_en,
        name_si: cat.name_si,
        name_ta: cat.name_ta,
        description_en: cat.description_en || '',
        description_si: cat.description_si || '',
        description_ta: cat.description_ta || '',
        iconName: cat.iconName || 'Grid',
        imageUrl: cat.imageUrl || '',
        subcategories: cat.subcategories,
        sortOrder: cat.sortOrder,
        requiresSpecialistVerification: Boolean(cat.requiresSpecialistVerification),
        isActive: cat.isActive,
        updatedAt: serverTimestamp(),
      });
    }
    for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
      await setDoc(doc(db, 'subscriptionPlans', plan.id), {
        id: plan.id,
        name: plan.name,
        monthlyPriceLkr: plan.monthlyPriceLkr,
        yearlyPriceLkr: plan.yearlyPriceLkr,
        listingLimit: plan.listingLimit,
        durationDays: plan.durationDays,
        features: plan.features,
        isActive: plan.isActive,
        updatedAt: serverTimestamp(),
      });
    }
    await setDoc(doc(db, 'adminSettings', 'global'), {
      id: 'global',
      defaultCommissionPct: 10,
      announcement_en: 'Launching across Western Province · All 25 Sri Lankan districts supported.',
      announcement_si: 'බස්නාහිර පළාතෙන් ආරම්භය · දිස්ත්‍රික්ක 25 පුරාම සහය දක්වයි.',
      announcement_ta: 'மேல் மாகாணத்தில் தொடக்கம் · அனைத்து 25 மாவட்டங்களும் ஆதரிக்கப்படுகின்றன.',
      supportEmail: 'support@myservice.lk',
      supportPhone: '+94 11 000 0000',
      isPublic: true,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'sync_default_catalog',
      targetPath: 'serviceCategories,subscriptionPlans,adminSettings',
      details: 'Initialized 15 categories, 3 subscription plans, and default commission settings',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'serviceCategories');
  }
}

export async function adminSaveCategory(
  adminUid: string,
  adminEmail: string,
  category: ServiceCategory
): Promise<void> {
  try {
    await setDoc(doc(db, 'serviceCategories', category.id), {
      id: category.id,
      slug: cleanStr(category.slug, 64),
      name_en: cleanStr(category.name_en, 80),
      name_si: cleanStr(category.name_si, 120),
      name_ta: cleanStr(category.name_ta, 120),
      description_en: cleanStr(category.description_en, 300),
      description_si: cleanStr(category.description_si, 400),
      description_ta: cleanStr(category.description_ta, 400),
      iconName: cleanStr(category.iconName, 40) || 'Grid',
      imageUrl: cleanStr(category.imageUrl, 300),
      subcategories: category.subcategories.slice(0, 30),
      sortOrder: Number(category.sortOrder) || 1,
      requiresSpecialistVerification: Boolean(category.requiresSpecialistVerification),
      isActive: category.isActive,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'save_category',
      targetPath: `serviceCategories/${category.id}`,
      details: `Saved category ${category.name_en}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `serviceCategories/${category.id}`);
  }
}

export async function adminDeleteCategory(adminUid: string, adminEmail: string, catId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'serviceCategories', catId));
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'delete_category',
      targetPath: `serviceCategories/${catId}`,
      details: `Deleted category ${catId}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `serviceCategories/${catId}`);
  }
}

export async function adminSaveSubscriptionPlan(
  adminUid: string,
  adminEmail: string,
  plan: SubscriptionPlan
): Promise<void> {
  try {
    await setDoc(doc(db, 'subscriptionPlans', plan.id), {
      id: plan.id,
      name: cleanStr(plan.name, 60),
      monthlyPriceLkr: Math.max(0, Number(plan.monthlyPriceLkr) || 0),
      yearlyPriceLkr: Math.max(0, Number(plan.yearlyPriceLkr) || 0),
      listingLimit: Math.max(1, Number(plan.listingLimit) || 3),
      durationDays: Math.max(1, Number(plan.durationDays) || 30),
      features: plan.features.slice(0, 15),
      isActive: plan.isActive,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'save_subscription_plan',
      targetPath: `subscriptionPlans/${plan.id}`,
      details: `Updated plan ${plan.name} (LKR ${plan.monthlyPriceLkr}/mo)`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `subscriptionPlans/${plan.id}`);
  }
}

export async function adminSaveSettings(
  adminUid: string,
  adminEmail: string,
  settings: AdminSettings
): Promise<void> {
  try {
    await setDoc(doc(db, 'adminSettings', 'global'), {
      id: 'global',
      defaultCommissionPct: Math.max(0, Math.min(50, Number(settings.defaultCommissionPct) || 0)),
      announcement_en: cleanStr(settings.announcement_en, 300),
      announcement_si: cleanStr(settings.announcement_si, 400),
      announcement_ta: cleanStr(settings.announcement_ta, 400),
      supportEmail: cleanStr(settings.supportEmail, 160),
      supportPhone: cleanStr(settings.supportPhone, 40),
      isPublic: true,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'save_admin_settings',
      targetPath: 'adminSettings/global',
      details: `Commission ${settings.defaultCommissionPct}%`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'adminSettings/global');
  }
}

export async function adminToggleUserAccountStatus(
  adminUid: string,
  adminEmail: string,
  targetUser: UserProfile,
  newStatus: 'active' | 'suspended'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      ...targetUser,
      accountStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: `user_${newStatus}`,
      targetPath: `users/${targetUser.uid}`,
      details: `Changed account status to ${newStatus}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function adminFetchAllOverviewData() {
  try {
    const [
      usersSnap,
      providersSnap,
      verifsSnap,
      listingsSnap,
      jobsSnap,
      bookingsSnap,
      subsSnap,
      commsSnap,
      paymentsSnap,
      reportsSnap,
      disputesSnap,
      logsSnap,
      featuredSnap,
      contactSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'providerProfiles')),
      getDocs(collection(db, 'providerVerification')),
      getDocs(collection(db, 'serviceListings')),
      getDocs(collection(db, 'jobRequests')),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'subscriptions')),
      getDocs(collection(db, 'commissionRecords')),
      getDocs(collection(db, 'paymentRecords')),
      getDocs(collection(db, 'reports')),
      getDocs(collection(db, 'disputes')),
      getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50))),
      getDocs(collection(db, 'featuredListings')),
      getDocs(collection(db, 'contactMessages')),
    ]);

    return {
      users: usersSnap.docs.map((d) => d.data() as UserProfile),
      providers: providersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProviderProfile, 'id'>) })),
      verifications: verifsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProviderVerification, 'id'>) })),
      listings: listingsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceListing, 'id'>) })),
      jobs: jobsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobRequest, 'id'>) })),
      bookings: bookingsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) })),
      subscriptions: subsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubscriptionRecord, 'id'>) })),
      commissions: commsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionRecord, 'id'>) })),
      payments: paymentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRecord, 'id'>) })),
      reports: reportsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReportItem, 'id'>) })),
      disputes: disputesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DisputeItem, 'id'>) })),
      auditLogs: logsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) })),
      featuredListings: featuredSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeaturedListing, 'id'>) })),
      contactMessages: contactSnap.docs.map((d) => ({ id: d.id, ...(d.data() as { name: string; email: string; subject: string; message: string; createdAt?: unknown }) })),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'admin_overview');
  }
}

export async function adminUpdateReportOrDispute(params: {
  adminUid: string;
  adminEmail: string;
  collectionName: 'reports' | 'disputes';
  docId: string;
  existingData: Record<string, unknown>;
  status: string;
  resolutionNote: string;
}): Promise<void> {
  try {
    const { id: _docId, ...restData } = params.existingData as Record<string, unknown> & { id?: unknown };
    await updateDoc(doc(db, params.collectionName, params.docId), {
      ...restData,
      status: params.status,
      resolutionNote: cleanStr(params.resolutionNote, 500),
    });
    await logAdminAction({
      actorUid: params.adminUid,
      actorEmail: params.adminEmail,
      action: `update_${params.collectionName}`,
      targetPath: `${params.collectionName}/${params.docId}`,
      details: `Status -> ${params.status}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${params.collectionName}/${params.docId}`);
  }
}

export async function adminToggleListingFeatured(
  adminUid: string,
  adminEmail: string,
  listing: ServiceListing,
  isFeatured: boolean
): Promise<void> {
  try {
    const { id: _listId, ...listingRest } = listing;
    await updateDoc(doc(db, 'serviceListings', listing.id), {
      ...listingRest,
      isFeatured,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: isFeatured ? 'feature_listing' : 'unfeature_listing',
      targetPath: `serviceListings/${listing.id}`,
      details: listing.title,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `serviceListings/${listing.id}`);
  }
}

export async function adminProcessPaymentRefund(
  adminUid: string,
  adminEmail: string,
  payment: PaymentRecord
): Promise<void> {
  try {
    await updateDoc(doc(db, 'paymentRecords', payment.id), {
      userId: payment.userId,
      paymentType: payment.paymentType,
      referenceId: payment.referenceId,
      amountLkr: payment.amountLkr,
      currency: payment.currency,
      transactionRef: payment.transactionRef,
      gatewayMode: payment.gatewayMode,
      status: 'refunded',
      refundStatus: 'refunded',
      createdAt: payment.createdAt,
    });
    await logAdminAction({
      actorUid: adminUid,
      actorEmail: adminEmail,
      action: 'refund_payment',
      targetPath: `paymentRecords/${payment.id}`,
      details: `Refunded ${payment.transactionRef} (LKR ${payment.amountLkr})`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `paymentRecords/${payment.id}`);
  }
}

export type {
  UserPrivateContact,
  SavedProvider,
  MessageItem,
};
