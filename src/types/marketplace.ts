export type LanguageCode = 'en' | 'si' | 'ta';

export type WorkspaceMode = 'customer' | 'provider';

export type VerificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'suspended';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  preferredLanguage: LanguageCode;
  province?: string;
  district?: string;
  city?: string;
  providerStatus: VerificationStatus;
  accountStatus: 'active' | 'suspended';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateContact {
  uid: string;
  email: string;
  phone?: string;
  privateAddress?: string;
  updatedAt?: unknown;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  fullName: string;
  businessName?: string;
  photoURL?: string;
  province: string;
  district: string;
  city: string;
  categoryIds: string[];
  subcategories?: string[];
  coverageDistricts: string[];
  yearsExperience: number;
  bio: string;
  qualifications?: string;
  startingPriceLkr: number;
  workingDays?: string[];
  timeSlots?: string;
  portfolioUrls?: string[];
  photoThumbnails?: string[];
  photoCaptions?: string[];
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  ratingAvg?: number;
  reviewCount?: number;
  subscriptionPlanId?: string;
  isSample?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProviderVerification {
  id: string;
  providerId: string;
  email: string;
  phone: string;
  nicOrRegNumber: string;
  certificateSummary?: string;
  documentNames?: string[];
  status: Exclude<VerificationStatus, 'not_submitted'>;
  reviewNotes?: string;
  reviewedBy?: string;
  submittedAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  description_en?: string;
  description_si?: string;
  description_ta?: string;
  iconName?: string;
  imageUrl?: string;
  subcategories: string[];
  sortOrder: number;
  requiresSpecialistVerification?: boolean;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  providerName: string;
  providerVerified?: boolean;
  title: string;
  categoryId: string;
  subcategory: string;
  description: string;
  province: string;
  district: string;
  city: string;
  coverageDistricts: string[];
  priceLkr: number;
  priceUnit?: string;
  imageUrl?: string;
  ratingAvg?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isSample?: boolean;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface JobRequest {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  categoryId: string;
  subcategory: string;
  description: string;
  province: string;
  district: string;
  city: string;
  preferredDate: string;
  preferredTime?: string;
  budgetMinLkr?: number;
  budgetMaxLkr?: number;
  instructions?: string;
  photoThumbnails?: string[];
  photoCaptions?: string[];
  status: 'open' | 'quoted' | 'assigned' | 'completed' | 'cancelled' | 'closed';
  assignedProviderId?: string;
  quotationCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface JobPrivateAddress {
  jobId: string;
  customerId: string;
  exactAddress: string;
  contactPhone?: string;
  updatedAt?: unknown;
}

export interface Quotation {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  providerId: string;
  providerName: string;
  providerVerified?: boolean;
  amountLkr: number;
  estimatedDuration: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Booking {
  id: string;
  jobId?: string;
  quotationId?: string;
  listingId?: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceTitle: string;
  district: string;
  city: string;
  scheduledDate: string;
  scheduledTime?: string;
  amountLkr: number;
  commissionRatePct?: number;
  commissionLkr?: number;
  status: 'pending_confirmation' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'demo_paid' | 'paid' | 'refunded';
  reviewSubmitted?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  contextTitle: string;
  lastMessage?: string;
  lastSenderId?: string;
  unreadByCustomer?: boolean;
  unreadByProvider?: boolean;
  updatedAt?: unknown;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  isRead: boolean;
  createdAt?: unknown;
}

export interface ReviewItem {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  rating: number;
  comment: string;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPriceLkr: number;
  yearlyPriceLkr: number;
  listingLimit: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
  updatedAt?: unknown;
}

export interface SubscriptionRecord {
  id: string;
  providerId: string;
  planId: string;
  planName: string;
  billingCycle: 'free' | 'monthly' | 'yearly';
  amountLkr: number;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  paymentMode: 'free' | 'payhere_sandbox_demo' | 'payhere_live';
  expiresAt?: string;
  createdAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  paymentType: 'booking' | 'subscription' | 'featured_listing';
  referenceId: string;
  amountLkr: number;
  currency: string;
  transactionRef: string;
  gatewayMode: 'payhere_sandbox_demo' | 'payhere_live';
  status: 'pending' | 'demo_verified' | 'paid' | 'failed' | 'refunded';
  refundStatus: 'none' | 'requested' | 'refunded';
  createdAt?: unknown;
}

export interface CommissionRecord {
  id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  grossAmountLkr: number;
  commissionRatePct: number;
  commissionAmountLkr: number;
  netProviderLkr: number;
  status: 'pending' | 'recorded' | 'settled' | 'waived';
  createdAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkPath?: string;
  isRead: boolean;
  createdAt?: unknown;
}

export interface SavedProvider {
  id: string;
  customerId: string;
  providerId: string;
  providerName: string;
  district?: string;
  createdAt?: unknown;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  targetUserId: string;
  targetType: 'provider' | 'customer' | 'listing' | 'review';
  reason: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolutionNote?: string;
  createdAt?: unknown;
}

export interface DisputeItem {
  id: string;
  bookingId: string;
  reporterId: string;
  targetUserId: string;
  summary: string;
  status: 'open' | 'investigating' | 'resolved_refund' | 'resolved_closed';
  resolutionNote?: string;
  createdAt?: unknown;
}

export interface FeaturedListing {
  id: string;
  listingId: string;
  providerId: string;
  title: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt?: unknown;
}

export interface AdminSettings {
  id: string;
  defaultCommissionPct: number;
  announcement_en?: string;
  announcement_si?: string;
  announcement_ta?: string;
  supportEmail?: string;
  supportPhone?: string;
  isPublic: boolean;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  targetPath: string;
  details?: string;
  createdAt?: unknown;
}
