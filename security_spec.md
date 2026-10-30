# AERC Rally Control — Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Global Safety Net**: Any collection or path not explicitly matched (`/users/{userId}`, `/drivers/{driverId}`, `/privateVault/{driverId}`, `/teams/{teamId}`, `/rounds/{roundId}`, `/settings/{settingId}`) is unconditionally denied (`allow read, write: if false`).
2. **PII Split-Collection Isolation (`/privateVault/{driverId}`)**: Personal Identifiable Information (`email`, `phone`, `age`, `isMinor`, `parentalConsentVerified`, `dataProtectionActAccepted`) is strictly isolated in `/privateVault/{driverId}` and never stored in `/drivers/{driverId}`. Read access to `/privateVault/{driverId}` is restricted strictly to the record owner (`resource.data.ownerUid == request.auth.uid`) or verified Organizers/Admins.
3. **Strict Key & Size Boundaries**: Every write operation (`create` and `update`) invokes a dedicated `isValid[Entity](incoming())` helper enforcing `keys().hasAll(...)`, `keys().hasOnly(...)`, type safety, and `.size() <= MAX` limits matching `firebase-blueprint.json`.
4. **Team Roster Limit**: `Team.driverIds` is strictly bounded to `size() <= 3` in the validation blueprint.
5. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates its path ID using `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
6. **Zero-Cost List Enforcement**: Every `allow list` rule evaluates `resource.data` directly without invoking `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on `/users/{userId}`**: `{ uid: "u1", email: "a@b.com", displayName: "Test", role: "driver", updatedAt: "2026-10-30", isAdmin: true }` -> Rejected by `hasOnly()`.
2. **Identity Spoofing on `/users/{userId}`**: Authenticated as `uid-A`, attempting to create `/users/uid-B` or setting `incoming().uid != request.auth.uid` -> Rejected by `request.auth.uid == userId && data.uid == request.auth.uid`.
3. **Invalid Role Escalation on `/users/{userId}`**: Setting `role: "superadmin"` -> Rejected by `data.role in ['organizer', 'manager', 'driver']`.
4. **Unverified Email Write**: Authenticated user with `email_verified == false` attempting to write to `/rounds/rnd-1` -> Rejected by `isVerifiedUser()`.
5. **PII Leak in `/drivers/{driverId}`**: Attempting to write `email` or `phone` into `/drivers/drv-1` -> Rejected by `isValidDriverPublic` `hasOnly()` key allowlist.
6. **Unauthorized PII Read on `/privateVault/{driverId}`**: Authenticated user `uid-B` attempting `get` on `/privateVault/drv-1` owned by `uid-A` -> Rejected by `resource.data.ownerUid == request.auth.uid || isAdmin()`.
7. **4-Driver Team Roster Overflow on `/teams/{teamId}`**: Setting `driverIds: ["d1", "d2", "d3", "d4"]` -> Rejected by `data.driverIds.size() <= 3`.
8. **1MB String Resource Poisoning on `/drivers/{driverId}`**: Setting `fullName` to a 5,000-character string -> Rejected by `data.fullName.size() <= 160`.
9. **Path ID Poisoning**: Creating `/drivers/invalid$id!@#` -> Rejected by `isValidId(driverId)`.
10. **Immutable ID Mutation on Update**: Updating `/drivers/drv-1` with `id: "drv-2"` -> Rejected by `incoming().id == existing().id`.
11. **Value Poisoning on `/rounds/{roundId}` Update**: Updating `stagesCount` with a string `"twelve"` -> Rejected because `isValidRallyRound(incoming())` wraps the `allow update` block.
12. **Minor Registration Without Consent Flag Type**: Creating `/privateVault/drv-1` with `age: 200` or `dataProtectionActAccepted: false` -> Rejected by `data.age >= 12 && data.age <= 90 && data.dataProtectionActAccepted == true`.
