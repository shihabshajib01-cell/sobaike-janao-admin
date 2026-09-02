# Sobai Ke Janao

Civic incident reporting and public transparency platform for Bangladesh.

---

## Overview

**Sobai Ke Janao** is a citizen-first civic reporting platform designed to document, verify, and resolve public incidents across three primary segments:
1. **Public Harassment** (Eve teasing, stalking, workplace/transit harassment)
2. **Extortion & Illegal Tolls** (Bus stand extortion, market extortion, illegal parking fees)
3. **Civic & Municipal Issues** (Road safety, drainage/waste, municipal irregularities)

The system enables secure, anonymous or identified citizen reporting, evidence preservation in private cloud storage, published report transparency, interactive location-based exploration, and bilingual accessibility.

---

## Architecture & Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Bundler & Build Tool**: Vite 6
- **Styling & Design System**: Tailwind CSS v4 + Motion
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL)
  - **Complaint Submissions**: Atomic Supabase RPC functions (`submit_public_complaint`) with idempotent request tracking
  - **Private Evidence Storage**: Supabase Storage bucket (`complaint-evidence`) with `register_public_complaint_evidence` RPC registration
  - **Public Data Access**: Querying of published reports, segments, and subcategories
- **Maps & Geolocation**: Interactive map visualization and consented browser geolocation with reverse geocoding
- **Internationalization**: Complete bilingual support (**English** / **বাংলা**)
- **Theming**: System / Light / Dark theme tokens
- **Hosting & Deployment**: Static SPA build deployed via GitHub Pages / Cloud Run

---

## Key Features

- **4-Step Incident Composer**:
  - Step 1: Category & Subcategory Selection across the three core segments
  - Step 2: Date, Time, and Incident Location (with interactive map and reverse geocoding)
  - Step 3: Detailed Description (2,000 character limit), identity choices, and privacy controls
  - Step 4: Evidence Upload (client-side image compression) and final Review
- **Private Evidence Preservation**: Securely uploads supporting photos/documents directly to Supabase private storage before administrative review.
- **Published Public Reports**: Citizens can browse published, moderated incident reports with status updates, timelines, and verified responses.
- **Consented Visitor Location**: Privacy-first location detection for showing nearby incidents and regional analytics.
- **Responsive Layout**: Designed for mobile touch targets, tablets, and desktop workstations.

---

## Getting Started

### Prerequisites

- **Node.js**: `18.x`, `20.x`, or `22.x`
- **npm** / **pnpm** / **yarn**

### Installation

1. Clone repository:
   ```bash
   git clone https://github.com/shihabshajib01-cell/sobaike-janao.git
   cd sobaike-janao
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Set your Supabase credentials in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
   VITE_GOOGLE_MAPS_API_KEY=your-optional-maps-key
   ```

### Development

Start the local development server:
```bash
npm run dev
```

### Production Build

```bash
npm run build
```

The compiled static assets are output to `dist/`.

---

## Deployment

The static build output in `dist/` is self-contained and ready for deployment to GitHub Pages, Cloud Run, Vercel, Netlify, or any static hosting service.
