# MYSERVICE Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users`, `providerProfiles`, `serviceListings`, `jobRequests`, `quotations`, `reviews`, `savedProviders`, `reports`, `disputes`) must bind its owner field (`uid`, `userId`, `customerId`, `providerId`, `reporterId`) strictly to `request.auth.uid` upon creation and keep it immutable on update.
2. **Admin Privilege Isolation**: Users cannot grant themselves `admin` privileges or modify `verificationStatus` to `verified` on `providerProfiles` or `providerVerification`. Only `isAdmin()` (verified email matching runtime admin or `/admins/{uid}` document) can verify/reject/suspend providers or mutate categories, plans, and global settings.
3. **PII & Exact Address Isolation**: User phone/address lives in `/users/{userId}/private/{docId}` (readable only by owner and admin). Exact job addresses live in `/jobRequests/{jobId}/private/{docId}` (readable only by customer, assigned provider on the parent job, and admin).
4. **Private Verification Documents**: `/providerVerification/{providerId}` is strictly isolated to the owning provider and admins.
5. **Booking & Review Integrity**: Only the customer owning a job can accept a quotation; only booking participants (`customerId` or `providerId`) or admins can read or transition a booking, and terminal states (`completed`, `cancelled`) block further user mutations.

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Verification Shadow Field**: Provider creates `/providerProfiles/{uid}` with `verificationStatus: "verified"` -> Denied (`verificationStatus` on create must be `"pending_review"` unless `isAdmin()`).
2. **Admin Privilege Escalation**: Signed-in non-admin writes `/admins/{uid}` -> Denied (admin-only write).
3. **Ghost Field Injection**: User updates `/users/{uid}` adding `{ isAdmin: true }` -> Denied (`affectedKeys().hasOnly(...)` + `hasOnly(...)` rejects unknown keys).
4. **PII Harvesting**: Signed-in user reads `/users/{otherUid}/private/contact` -> Denied (owner or admin only).
5. **Exact Address Leak**: Unassigned provider reads `/jobRequests/{jobId}/private/address` -> Denied (`assignedProviderId != request.auth.uid`).
6. **Unauthorized Quotation Acceptance**: Provider updates `/quotations/{id}` to `status: "accepted"` -> Denied (only `customerId` can accept).
7. **Cross-User Listing Tamper**: Provider A updates `/serviceListings/{listingOfB}` -> Denied (`existing().providerId == request.auth.uid`).
8. **Fake Timestamp Injection**: Client writes `createdAt: "2020-01-01"` instead of `request.time` -> Denied.
9. **Path ID Poisoning**: Client writes to `/serviceListings/bad id with spaces and 1000 chars` -> Denied (`isValidId()` regex + length <= 128).
10. **Review Without Ownership**: User creates `/reviews/{id}` with `customerId` of another user -> Denied (`incoming().customerId == request.auth.uid`).
11. **Terminal Booking Mutation**: Customer/provider updates a `completed` booking -> Denied (`existing().status != 'completed'`).
12. **Blanket Conversation Scrape**: Non-participant lists `/conversations` without matching `customerId` or `providerId` -> Denied.
