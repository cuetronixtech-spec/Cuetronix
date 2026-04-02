

# Cuetronix — Full Page Scaffold Plan

## Overview
Build all 40+ pages from the PRD as structural shells with a fully working App Shell (sidebar, topbar, mobile bottom nav), wired with React Router. Each page will have proper layout structure (headers, sections, empty tables/cards) but minimal mock data. Supabase integration will be added later via Cursor.

---

## 1. App Shell & Layout Components

- **AppShell** — Main wrapper with sidebar + topbar + `<Outlet />`
- **AppSidebar** — Collapsible sidebar using shadcn Sidebar component with all nav items grouped per PRD (Dashboard, POS, Stations, Products, Customers | Reports, Bookings, Tournaments | Staff, Expenses, Cash, Investors | AI Assistant, Settings, How to Use). Active route highlighting with NavLink.
- **Topbar** — Sidebar toggle, page title, notification bell placeholder
- **MobileBottomNav** — Visible on mobile with Dashboard, POS, Stations, Customers, More drawer
- **SuperAdminShell** — Separate shell for super admin routes
- **CustomerShell** — Separate shell for customer portal routes

## 2. SaaS Marketing Pages (public, no shell)

| Page | Route | Structure |
|------|-------|-----------|
| **Landing** | `/` | Hero, features grid, pricing preview, CTA, footer |
| **Pricing** | `/pricing` | Plan comparison table (Starter/Growth/Pro/Business) |
| **Sign Up** | `/signup` | Club name, slug, email, password form |
| **Sign In** | `/signin` | Email/password + Google OAuth button |
| **Forgot Password** | `/forgot-password` | Email input form |

## 3. Onboarding

| Page | Route | Structure |
|------|-------|-----------|
| **Setup Wizard** | `/onboarding` | 5-step wizard: Club Info → Stations → Products → Staff Invite → Done |

## 4. Protected App Pages (inside AppShell)

| Page | Route | Structure |
|------|-------|-----------|
| **Dashboard** | `/dashboard` | Stats cards row, revenue chart placeholder, recent activity, quick actions |
| **POS** | `/pos` | Two-column: station/product selector + cart/checkout panel |
| **Stations** | `/stations` | Grid of station cards with status indicators |
| **Products** | `/products` | Data table with category tabs, add product button |
| **Customers** | `/customers` | Data table with search, customer detail drawer |
| **Reports** | `/reports` | Tab layout: Sales, Revenue, Sessions, Staff |
| **Booking Management** | `/booking-management` | Calendar view + booking list table |
| **Staff Management** | `/staff` | Staff table + invite button |
| **Staff Portal** | `/staff-portal` | Attendance, leave requests, schedule |
| **Tournaments** | `/tournaments` | Tournament cards + create form |
| **Expenses** | `/expenses` | Expense table + add form, category breakdown |
| **Cash Management** | `/cash` | Vault balance card, transaction log table |
| **Investors** | `/investors` | Financial summary cards, revenue chart, investor report |
| **AI Assistant** | `/chat-ai` | Chat interface with message list + input |
| **Login Logs** | `/login-logs` | Log table with filters |
| **How to Use** | `/how-to-use` | Accordion FAQ / guide sections |
| **Settings** | `/settings` | Tab layout: General, Branding, Stations, Products, Billing, Payment Gateway, Notifications, Receipts, Staff, Data |

## 5. Public Club Pages (no shell, tenant-branded header)

| Page | Route | Structure |
|------|-------|-----------|
| **Public Booking** | `/public/booking` | Date/time picker, station selector, booking form |
| **Public Tournaments** | `/public/tournaments` | Tournament list with registration |
| **Public Stations** | `/public/stations` | Live station availability grid |
| **Payment Success** | `/public/payment/success` | Success confirmation card |
| **Payment Failed** | `/public/payment/failed` | Failure message with retry |
| **Tournament Payment Success** | `/public/payment/tournament-success` | Tournament registration confirmation |

## 6. Customer Portal (inside CustomerShell)

| Page | Route | Structure |
|------|-------|-----------|
| **Customer Login** | `/customer/login` | Phone/email OTP login form |
| **Customer Dashboard** | `/customer` | Loyalty points, recent visits, upcoming bookings |
| **Customer Bookings** | `/customer/bookings` | Booking list + new booking button |
| **Customer Offers** | `/customer/offers` | Active offers/promotions grid |
| **Customer Profile** | `/customer/profile` | Profile form with edit |

## 7. Super Admin (inside SuperAdminShell)

| Page | Route | Structure |
|------|-------|-----------|
| **Super Admin Login** | `/super-admin/login` | Email/password login |
| **SA Dashboard** | `/super-admin` | KPI cards: tenants, MRR, trials, churn |
| **SA Tenants** | `/super-admin/tenants` | Tenant table with status filters |
| **SA Tenant Detail** | `/super-admin/tenants/:id` | Tenant info, usage, actions (impersonate, extend trial) |
| **SA Revenue** | `/super-admin/revenue` | MRR/ARR charts, plan breakdown |
| **SA Plans** | `/super-admin/plans` | Plan editor table |
| **SA Broadcast** | `/super-admin/broadcast` | Message compose form + history |
| **SA Audit Log** | `/super-admin/audit-log` | Searchable audit log table |

## 8. Legal Pages (simple layouts)

| Page | Route |
|------|-------|
| **Privacy Policy** | `/privacy-policy` |
| **Terms & Conditions** | `/terms-and-conditions` |
| **Refund Policy** | `/refund-policy` |
| **Contact** | `/contact` |

## 9. Route Guards (placeholder wrappers)

- `RequireAuth` — passes through children (no auth logic yet)
- `RequireSuperAdmin` — passes through children
- `RequireCustomer` — passes through children
- `RequireRole` — passes through children
- `RequireActiveSubscription` — passes through children
- `FeatureGate` — passes through children

## 10. Design Approach

- Clean, modern UI using shadcn/ui components throughout
- Consistent page headers with title + description + action buttons
- Tables use shadcn Table component with column headers
- Cards for dashboard widgets and stat displays
- Proper spacing and responsive layout (mobile-friendly)
- Default light theme with the existing color system

