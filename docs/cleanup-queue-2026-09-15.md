# Foreground cleanup queue

Execution is strictly sequential. A later task does not begin until the active task is verified and closed.

1. Admin mock / dummy / dead-code cleanup — ACTIVE
2. Harassment UX correction — QUEUED
   - Remove Harassment classification filters from the feed only; keep Search and report filtering.
   - Standardize all mandatory-field asterisks to the existing red required style.
   - Fix the shared searchable dropdown / combobox behavior without changing working normal selects.
3. Gemini / Google AI Studio footprint cleanup — WAITING

Regression rule: protect completed Harassment, Public security, Supabase contracts, Admin alignment, EN/BN, mobile, themes, routing, permissions, and production behavior.
