# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

DuHoc24 — sample "study-abroad application intake portal" (Vietnamese-language UI) for a 6-week programming course. The repo is at **Week 1**: static UI only. All data is hard-coded mock data; there is no API, database, auth, or test suite yet. README.md holds the week-by-week roadmap (Gemini chatbot → Supabase → document extraction → Make.com automation → magic-link login); check it before assuming a backend exists. `/login` is intentionally not built.

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint (flat config, eslint.config.mjs)
```

No test runner is configured. Env vars (`.env.example`) are not needed to run the current UI.

## Architecture

- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS v4. Per AGENTS.md, this Next.js version has breaking changes — consult `node_modules/next/dist/docs/` before writing Next-specific code.
- Routes: `/` (landing), `/portal` (student document portal), `/admin/{requests,schools,profiles,conversations}` (`/admin` redirects to requests). `app/admin/layout.tsx` wraps all admin pages with the sidebar/mobile nav.
- **`lib/mock-data.ts` is the single data source** for every page and component: types (`DocStatus`, `RequestStatus`, `ServicePackage`, `School`, `AdmissionRequest`, `StudentProfile`, `Conversation`…) and the hard-coded arrays. Enum-like values are Vietnamese snake_case strings (e.g. `"cho_duyet"`, `"hop_le"`) rendered via `components/status-badge.tsx`. Later weeks replace these exports with Supabase queries, so keep types in this file as the contract.
- Components are grouped by feature: `components/landing`, `components/portal`, `components/admin`, plus shared `site-header`, `site-footer`, `logo`, `status-badge`. Landing interactive pieces (`quote-form`, `chat-widget`) are `"use client"` and currently static.
- UI primitives in `components/ui` come from shadcn/ui (style `base-nova`, built on Base UI, `@base-ui/react`; icons from `lucide-react`). Add new ones with the shadcn CLI (`components.json`; also registers the `@tailark-oss` registry) rather than hand-writing them. Use `cn()` from `lib/utils.ts` for class merging. Path alias `@/*` maps to the repo root.
- Remote images are only allowed from `images.unsplash.com` (`next.config.ts`).

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
