---
name: Onboarding database schema
description: The onboarding profile endpoint depends on the identity tables being present in the active development database.
---

Protected onboarding routes must be tested against a database with the current Drizzle schema applied, especially the user profile and staff request tables.

**Why:** Authentication can succeed while the first profile read still fails with a server error when the database schema has not been pushed.

**How to apply:** When `/api/me` returns a database relation error, sync the existing development schema before changing auth or onboarding UI code.