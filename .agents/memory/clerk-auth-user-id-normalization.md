---
name: Clerk auth user ID normalization
description: Clerk sessions may expose the authenticated user ID through different typed fields.
---

Normalize Clerk's authenticated user ID at the server auth boundary by accepting a non-empty string from `sessionClaims.userId` first and `auth.userId` second.

**Why:** Newly signed-in users can otherwise be rejected by protected profile requests even though Clerk has an active session.

**How to apply:** Keep route handlers dependent on one string-returning `getUserId` helper rather than reading Clerk auth fields directly.