# Sobai Ke Janao Admin

Administration and operational interface for the Sobai Ke Janao civic reporting platform.

## Current architecture

- React 19 + TypeScript
- Vite 6
- React Router 7
- Tailwind CSS 4
- Supabase Auth, Postgres, Realtime and Edge Functions
- Lucide React
- Leaflet / React Leaflet
- jsPDF / jsPDF AutoTable

The Admin application reads and mutates production data through permission-gated Supabase RPCs and services. There is no mock/offline API fallback layer in the production architecture.

## Main capabilities

- Administrator authentication and RBAC
- Dashboard and operational summaries
- Complaint/report management and moderation
- Published-report verification against the Public site
- Category and subcategory management
- Dynamic reporting form builder and schema publishing
- News Intake, source validation, duplicate protection and publishing
- Banner management
- Notifications
- Responses
- Users and roles
- Audit/activity logs
- Map and location activity views
- EN/BN localization
- Light/dark/system theme support
- Responsive desktop/tablet/mobile layouts

## Development

Prerequisites:

- Node.js 22
- npm

Install and run:

```bash
npm ci
npm run dev
```

The local Vite server runs on port 3000.

## Environment

Copy `.env.example` to `.env` when local overrides are required.

Supported variables:

```env
VITE_BASE_PATH=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is preferred. The legacy anon-key variable remains supported for compatibility.

## Quality commands

```bash
npm run lint
npm run build
npm run audit:dead-code
npm run audit:hardening
npm run audit:global-ux
npm run audit:notifications
npm run audit:responsive-tables
npm run audit:buttons
npm run audit:table-page-size
npm run audit:tags-feedback
npm run audit:duplicate-reports
npm run audit:news-intake
npm run audit:news-intake-behavior
npm run audit:news-intake-publisher-fixtures
npm run audit:news-intake-preview-parity
```

CI runs the production audits, TypeScript validation and build on `main` and pull requests.

## Deployment

The Admin application deploys through GitHub Actions to the configured GitHub Pages environment and custom domain.

Current custom domain:

```
admin.shobaikejanao.com
```

Deployment is followed by production and browser-functional smoke tests.

## Source layout

```
src/
  components/   shared UI and domain components
  context/      auth, language and notifications
  hooks/        reusable application hooks
  lib/          platform clients
  pages/        route-level views
  routes/       route definitions
  services/     Supabase-backed application services
  themes/       design tokens and theme providers
  types/        shared TypeScript contracts
  utils/        reusable helpers

scripts/         CI and regression audits
supabase/        migrations and Edge Functions
.github/         CI, deploy and smoke workflows
```
