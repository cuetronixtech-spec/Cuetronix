import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── Contexts ──────────────────────────────────────────────────────────────────
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppShell from "@/components/layout/AppShell";
import SuperAdminShell from "@/components/layout/SuperAdminShell";
import CustomerShell from "@/components/layout/CustomerShell";

// ── Route Guards ──────────────────────────────────────────────────────────────
import {
  RequireAuth,
  RequireSuperAdmin,
  RequireCustomer,
  RequireActiveSubscription,
  RequireRole,
  FeatureGate,
} from "@/components/guards/RequireAuth";

// ── Marketing / Auth ──────────────────────────────────────────────────────────
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import SignUp from "@/pages/SignUp";
import SignIn from "@/pages/SignIn";
import ForgotPassword from "@/pages/ForgotPassword";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import Subscription from "@/pages/Subscription";

// ── Protected App pages ───────────────────────────────────────────────────────
import Dashboard from "@/pages/app/Dashboard";
import POS from "@/pages/app/POS";
import Stations from "@/pages/app/Stations";
import Products from "@/pages/app/Products";
import Customers from "@/pages/app/Customers";
import Reports from "@/pages/app/Reports";
import BookingManagement from "@/pages/app/BookingManagement";
import StaffManagement from "@/pages/app/StaffManagement";
import StaffPortal from "@/pages/app/StaffPortal";
import Tournaments from "@/pages/app/Tournaments";
import Expenses from "@/pages/app/Expenses";
import CashManagement from "@/pages/app/CashManagement";
import Investors from "@/pages/app/Investors";
import ChatAI from "@/pages/app/ChatAI";
import LoginLogs from "@/pages/app/LoginLogs";
import HowToUse from "@/pages/app/HowToUse";
import Settings from "@/pages/app/Settings";

// ── Public club pages ─────────────────────────────────────────────────────────
import PublicBooking from "@/pages/public/PublicBooking";
import PublicTournaments from "@/pages/public/PublicTournaments";
import PublicStations from "@/pages/public/PublicStations";
import PaymentSuccess from "@/pages/public/PaymentSuccess";
import PaymentFailed from "@/pages/public/PaymentFailed";
import TournamentPaymentSuccess from "@/pages/public/TournamentPaymentSuccess";

// ── Customer portal ───────────────────────────────────────────────────────────
import CustomerLogin from "@/pages/customer/CustomerLogin";
import CustomerDashboard from "@/pages/customer/CustomerDashboard";
import CustomerBookings from "@/pages/customer/CustomerBookings";
import CustomerOffers from "@/pages/customer/CustomerOffers";
import CustomerProfile from "@/pages/customer/CustomerProfile";

// ── Super Admin ───────────────────────────────────────────────────────────────
import SuperAdminLogin from "@/pages/superadmin/SuperAdminLogin";
import SADashboard from "@/pages/superadmin/SADashboard";
import SATenants from "@/pages/superadmin/SATenants";
import SATenantDetail from "@/pages/superadmin/SATenantDetail";
import SARevenue from "@/pages/superadmin/SARevenue";
import SAPlans from "@/pages/superadmin/SAPlans";
import SABroadcast from "@/pages/superadmin/SABroadcast";
import SAAuditLog from "@/pages/superadmin/SAAuditLog";

// ── Legal ─────────────────────────────────────────────────────────────────────
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsAndConditions from "@/pages/legal/TermsAndConditions";
import RefundPolicy from "@/pages/legal/RefundPolicy";
import Contact from "@/pages/legal/Contact";

import NotFound from "@/pages/NotFound";

// ─── QueryClient ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

// ─── App ──────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ─── Marketing / Auth ─────────────────────────────── */}
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* ─── Onboarding (auth required, no subscription gate) ─ */}
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />

              {/* ─── Subscription paywall (auth required) ─────────── */}
              <Route
                path="/subscription"
                element={
                  <RequireAuth>
                    <Subscription />
                  </RequireAuth>
                }
              />

              {/* ─── Protected App ────────────────────────────────── */}
              <Route
                element={
                  <RequireAuth>
                    <RequireActiveSubscription>
                      <AppShell />
                    </RequireActiveSubscription>
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/stations" element={<Stations />} />
                <Route path="/products" element={<Products />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/booking-management" element={<BookingManagement />} />
                <Route path="/staff" element={<RequireRole roles={["admin"]}><StaffManagement /></RequireRole>} />
                <Route path="/staff-portal" element={<RequireRole roles={["staff", "manager"]}><StaffPortal /></RequireRole>} />
                <Route path="/tournaments" element={<FeatureGate feature="tournaments"><Tournaments /></FeatureGate>} />
                <Route path="/expenses" element={<FeatureGate feature="expenses"><Expenses /></FeatureGate>} />
                <Route path="/cash" element={<FeatureGate feature="cash_management"><CashManagement /></FeatureGate>} />
                <Route path="/investors" element={<FeatureGate feature="investors"><Investors /></FeatureGate>} />
                <Route path="/chat-ai" element={<FeatureGate feature="ai_assistant"><ChatAI /></FeatureGate>} />
                <Route path="/login-logs" element={<RequireRole roles={["admin"]}><LoginLogs /></RequireRole>} />
                <Route path="/how-to-use" element={<HowToUse />} />
                <Route path="/settings" element={<RequireRole roles={["admin"]}><Settings /></RequireRole>} />
              </Route>

              {/* ─── Public Club Pages ────────────────────────────── */}
              <Route path="/public/booking" element={<PublicBooking />} />
              <Route path="/public/tournaments" element={<PublicTournaments />} />
              <Route path="/public/stations" element={<PublicStations />} />
              <Route path="/public/payment/success" element={<PaymentSuccess />} />
              <Route path="/public/payment/failed" element={<PaymentFailed />} />
              <Route path="/public/payment/tournament-success" element={<TournamentPaymentSuccess />} />

              {/* ─── Customer Portal ──────────────────────────────── */}
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route element={<RequireCustomer><CustomerShell /></RequireCustomer>}>
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/customer/bookings" element={<CustomerBookings />} />
                <Route path="/customer/offers" element={<CustomerOffers />} />
                <Route path="/customer/profile" element={<CustomerProfile />} />
              </Route>

              {/* ─── Super Admin ──────────────────────────────────── */}
              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route element={<RequireSuperAdmin><SuperAdminShell /></RequireSuperAdmin>}>
                <Route path="/super-admin" element={<SADashboard />} />
                <Route path="/super-admin/tenants" element={<SATenants />} />
                <Route path="/super-admin/tenants/:id" element={<SATenantDetail />} />
                <Route path="/super-admin/revenue" element={<SARevenue />} />
                <Route path="/super-admin/plans" element={<SAPlans />} />
                <Route path="/super-admin/broadcast" element={<SABroadcast />} />
                <Route path="/super-admin/audit-log" element={<SAAuditLog />} />
              </Route>

              {/* ─── Legal ────────────────────────────────────────── */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
