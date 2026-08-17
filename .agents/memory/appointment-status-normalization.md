---
name: Appointment status normalization
description: Compatibility rules for appointment statuses across the API contract and stored records.
---

The public API uses `confirmed` and `rejected`, while existing stored records may use `approved` and `declined`; keep both forms normalized at route boundaries.

**Why:** Existing records must remain readable and safe after the API-facing status names evolve.

**How to apply:** When filtering availability or updating appointments, treat pending/approved/confirmed as active and cancelled/declined/rejected/completed as non-blocking.