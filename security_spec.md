# Nhiphoc Security Specification

## 1. Data Invariants
1. **Identity Integrity**: Every user document in `users_public/{userId}` and `users_private/{userId}` MUST match `request.auth.uid == userId`, with `email_verified == true`.
2. **PII Isolation**: Emails and phone numbers are stored strictly in `users_private/{userId}`, readable and writable ONLY by the document owner.
3. **Workspace Membership Gate**: A `student`, `parent`, or `assistant` can only read or write `assignments`, `focus_sessions`, `messages`, `schedules`, or `feedback_tickets` if their `uid` matches `studentUid`, `parentUid`, `assistantUid`, or `createdBy` on the referenced `/students/{studentId}` document.
4. **No Orphaned Records**: Every `assignment`, `focus_session`, `message`, `schedule`, and `feedback_ticket` MUST reference an existing `/students/{studentId}` document via `exists()`.
5. **Immutable Ownership & Timestamps**: `createdAt`, `createdBy`, `uid`, `id`, and `studentId` are immutable after creation. All `createdAt` and `updatedAt` fields MUST equal `request.time`.
6. **Terminal State Locking**:
   - `assignments` with `status == 'graded'` cannot be updated.
   - `schedules` with `status in ['completed', 'cancelled']` cannot be updated.
   - `feedback_tickets` with `status == 'closed'` cannot be updated.
7. **No Blanket List Scraping**: `users_public`, `users_private`, and `student_invites` forbid `allow list`. Every `allow list` on shared collections evaluates `resource.data` against `request.auth.uid` with zero `get()`/`exists()` calls.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Public Profile**: `{ uid: "u1", displayName: "An", role: "student", isOnline: false, isAdmin: true, createdAt: ..., updatedAt: ... }` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
2. **Role Escalation Update**: Updating `users_public/u1` with `{ role: "assistant" }` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(['displayName', 'isOnline', 'updatedAt'])` + `incoming().role == existing().role`).
3. **Unverified Email Write**: Authenticated user with `email_verified: false` writing to `students/s1` -> `PERMISSION_DENIED`.
4. **PII Blanket Read**: User `u2` reading `users_private/u1` -> `PERMISSION_DENIED`.
5. **Path ID Poisoning**: Creating document with 200-char ID or invalid characters (`../admin`) -> `PERMISSION_DENIED` (`isValidId()`).
6. **Orphaned Assignment**: Creating an assignment with non-existent `studentId: "fake_id"` -> `PERMISSION_DENIED` (`exists()` check fails).
7. **Identity Spoofing on Message**: Sending a message with `senderUid: "other_user"` -> `PERMISSION_DENIED` (`senderUid == request.auth.uid`).
8. **Terminal State Mutation**: Modifying an assignment whose `status` is already `'graded'` -> `PERMISSION_DENIED`.
9. **State Shortcutting**: Student trying to update assignment `status` directly from `'pending'` to `'graded'` -> `PERMISSION_DENIED`.
10. **Payload Bomb (Denial of Wallet)**: Uploading a `photoDataUrl` exceeding 260,000 chars -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Sending a backdated `createdAt` timestamp instead of `request.time` -> `PERMISSION_DENIED`.
12. **Blanket List Query**: Querying `collection(db, 'student_invites')` or `collection(db, 'users_public')` -> `PERMISSION_DENIED`.
