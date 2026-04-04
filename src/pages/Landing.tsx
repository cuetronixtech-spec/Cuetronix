import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Monitor, Users, BarChart3, CalendarDays, Trophy,
  Package, Settings, Globe, Zap, Shield,
  ChevronDown, ArrowRight, Play, Check, Layers,
  CreditCard, Database, Bot, Clock, Eye,
  Sparkles, Menu, X, ExternalLink, LayoutDashboard,
  Receipt, UserCircle, BarChart2, MessageSquare,
  Banknote, FileText, PieChart, Lock, Cpu, Activity,
} from "lucide-react";

// ─── CSS-in-JS style objects ────────────────────────────────────────────────

const S = {
  bgBase: {
    background: `
      radial-gradient(ellipse 120% 80% at 50% -35%, rgba(124, 58, 237, 0.2), transparent 55%),
      radial-gradient(ellipse 70% 50% at 110% 10%, rgba(34, 211, 238, 0.1), transparent 50%),
      radial-gradient(ellipse 55% 45% at -15% 55%, rgba(124, 58, 237, 0.08), transparent 45%),
      linear-gradient(170deg, #060912 0%, #0b1020 38%, #0f0f1a 100%)
    `,
    minHeight: "100vh",
  } as React.CSSProperties,

  headerShell: {
    position: "sticky" as const,
    top: 16,
    zIndex: 50,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    background: "linear-gradient(180deg, rgba(14, 18, 32, 0.72), rgba(10, 14, 28, 0.52))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 12px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
    borderRadius: 22,
    margin: "0 16px",
  } as React.CSSProperties,

  glassCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 20px 60px rgba(0,0,0,0.28)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: 28,
  } as React.CSSProperties,

  panelGlass: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.09)",
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.24)",
    borderRadius: 20,
  } as React.CSSProperties,

  btnPrimary: {
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 8px 30px rgba(124,58,237,0.34)",
    borderRadius: 12,
    padding: "12px 28px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  btnSecondary: {
    background: "rgba(255,255,255,0.06)",
    color: "#f7f8ff",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderRadius: 12,
    padding: "12px 28px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  statChip: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 999,
    color: "#b7bfd9",
    fontSize: 13,
    padding: "6px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,

  footerShell: {
    background: "linear-gradient(180deg, rgba(8, 10, 20, 0.95), rgba(6, 8, 16, 1))",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  } as React.CSSProperties,

  sectionDivider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.3) 30%, rgba(34,211,238,0.3) 70%, transparent)",
    margin: "0 auto",
    maxWidth: 800,
  } as React.CSSProperties,
};

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Modules", href: "#modules" },
  { label: "White-label", href: "#whitelabel" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const PROOF_STATS = [
  { value: "99.9%", label: "Uptime target", icon: Activity, color: "#4ade80" },
  { value: "5s", label: "Tenant provisioning", icon: Zap, color: "#22d3ee" },
  { value: "2.5s", label: "Cold shell load", icon: Clock, color: "#a78bfa" },
  { value: "16+", label: "Core modules", icon: Layers, color: "#f97316" },
  { value: "3", label: "Payment gateways", icon: CreditCard, color: "#fbbf24" },
  { value: "∞", label: "Multi-currency support", icon: Globe, color: "#7c3aed" },
];

const FEATURE_PILLARS = [
  {
    icon: Monitor,
    gradient: "linear-gradient(135deg, #7c3aed, #22d3ee)",
    title: "Sessions & POS",
    desc: "Session timers, live billing, receipt generation, and payment collection with multi-method support.",
    bullets: ["Real-time table/station timers", "Timer-based pricing engine", "Multi-payment collection", "Digital receipt delivery"],
  },
  {
    icon: CalendarDays,
    gradient: "linear-gradient(135deg, #f97316, #fbbf24)",
    title: "Bookings & Tournaments",
    desc: "Public booking pages, tournament registration, slot management, and confirmation workflows.",
    bullets: ["Public online booking pages", "Tournament brackets & registration", "Slot availability management", "Payment & confirmation flows"],
  },
  {
    icon: Package,
    gradient: "linear-gradient(135deg, #22d3ee, #4ade80)",
    title: "Products & Inventory",
    desc: "Category-managed stock with low-stock alerts, and integrated product sales at the POS.",
    bullets: ["Category-based product catalog", "Real-time stock tracking", "Low-stock alert system", "POS-integrated product sales"],
  },
  {
    icon: Users,
    gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    title: "Customers & Loyalty",
    desc: "Customer records, loyalty balances, personalised offers, and a branded customer portal.",
    bullets: ["Customer CRM & profiles", "Loyalty wallet & balance", "Targeted offers engine", "Self-serve customer portal"],
  },
  {
    icon: Shield,
    gradient: "linear-gradient(135deg, #fb7185, #f97316)",
    title: "Staff & Operations",
    desc: "Staff roles, leave and overtime workflows, cash register management, and expense tracking.",
    bullets: ["Role-based staff access", "Leave & overtime workflows", "Cash register management", "Expense categorisation"],
  },
  {
    icon: BarChart3,
    gradient: "linear-gradient(135deg, #fbbf24, #f97316)",
    title: "Reports & AI",
    desc: "Revenue analytics, session insights, data exports, investor dashboards, and a built-in AI business assistant.",
    bullets: ["Revenue & session analytics", "Investor-grade dashboard", "CSV/PDF data exports", "AI business assistant"],
  },
];

const MODULES = [
  { icon: LayoutDashboard, name: "Dashboard", desc: "Central operations overview", tag: "Core", tagColor: "#7c3aed" },
  { icon: Receipt, name: "POS", desc: "Point-of-sale & billing", tag: "Core", tagColor: "#7c3aed" },
  { icon: Monitor, name: "Gaming Stations", desc: "Station lifecycle & timers", tag: "Core", tagColor: "#7c3aed" },
  { icon: Package, name: "Products", desc: "Inventory & stock control", tag: "Core", tagColor: "#7c3aed" },
  { icon: Users, name: "Customers", desc: "CRM, loyalty & wallets", tag: "Core", tagColor: "#7c3aed" },
  { icon: BarChart2, name: "Reports", desc: "Analytics & data exports", tag: "Core", tagColor: "#7c3aed" },
  { icon: CalendarDays, name: "Booking Management", desc: "Reservations & scheduling", tag: "Advanced", tagColor: "#22d3ee" },
  { icon: Shield, name: "Staff Management", desc: "HR, roles & leave flows", tag: "Advanced", tagColor: "#22d3ee" },
  { icon: Trophy, name: "Tournaments", desc: "Events & bracket management", tag: "Advanced", tagColor: "#22d3ee" },
  { icon: Banknote, name: "Cash Management", desc: "Register opens, closes & floats", tag: "Advanced", tagColor: "#22d3ee" },
  { icon: FileText, name: "Expenses", desc: "Operational cost tracking", tag: "Advanced", tagColor: "#22d3ee" },
  { icon: PieChart, name: "Investor Module", desc: "Investor-grade P&L views", tag: "Plan-gated", tagColor: "#f97316" },
  { icon: Bot, name: "AI Assistant", desc: "Contextual business AI", tag: "Plan-gated", tagColor: "#f97316" },
  { icon: Settings, name: "Settings", desc: "Workspace & brand config", tag: "Core", tagColor: "#7c3aed" },
  { icon: UserCircle, name: "Customer Portal", desc: "Self-serve branded portal", tag: "Public-facing", tagColor: "#4ade80" },
  { icon: Lock, name: "Super Admin", desc: "Platform-level tenant control", tag: "Platform", tagColor: "#fb7185" },
];

const INFRA_STACK = [
  { name: "Vercel", desc: "Edge-deployed app shell", icon: Globe },
  { name: "Supabase", desc: "RLS-enforced Postgres + Auth", icon: Database },
  { name: "Cloudflare", desc: "CDN, DNS & security layer", icon: Shield },
  { name: "Upstash Redis", desc: "Rate limiting & caching", icon: Zap },
  { name: "Resend", desc: "Transactional email delivery", icon: MessageSquare },
  { name: "Sentry", desc: "Error monitoring & alerting", icon: Activity },
  { name: "PostHog", desc: "Product analytics & funnels", icon: BarChart3 },
  { name: "Stripe / Razorpay / Square", desc: "Regional payment gateways", icon: CreditCard },
];

const FAQS = [
  {
    q: "Is Cuetronix only for snooker and pool clubs?",
    a: "No. Cuetronix is built for gaming clubs, snooker parlours, billiards centres, esports lounges, bowling alleys, pool halls, and similar leisure venues — any venue that manages timed stations, bookings, and customer operations.",
  },
  {
    q: "Does it support public bookings?",
    a: "Yes. Public booking, public tournaments, public station pages, payment success/failure pages, and tenant-themed public routes are all first-class platform features.",
  },
  {
    q: "Can each tenant use its own brand?",
    a: "Yes. Every tenant can configure their logo, favicon, primary colours, fonts, and default mode. White-label control — including the powered-by badge visibility — is tied to plan logic.",
  },
  {
    q: "Can customers access their own portal?",
    a: "Yes. Cuetronix includes a dedicated customer portal with login, dashboard, bookings, offers, profile management, loyalty balance, and a mobile-first experience.",
  },
  {
    q: "Is there a live demo?",
    a: "Yes. A no-friction sandbox at demo.app.cuetronix.com gives anyone one-click access to a fully seeded tenant environment with realistic stations, customers, bookings, and more. The demo resets automatically every 24 hours.",
  },
  {
    q: "Which payment gateways are supported?",
    a: "Cuetronix supports Stripe, Razorpay, and Square — selected based on region, tenant plan, and use case (platform billing vs. tenant-level payment flows).",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlowOrb({ color, size, top, left, right, opacity = 0.18 }: {
  color: string; size: number; top?: number | string; left?: number | string; right?: number | string; opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${size * 0.55}px)`,
        opacity,
        top,
        left,
        right,
        pointerEvents: "none",
      }}
    />
  );
}

function Badge({ children, color = "#7c3aed" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      borderRadius: 999,
      padding: "4px 14px",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
      <Badge>{children}</Badge>
    </div>
  );
}

function HeroDashboardMockup() {
  return (
    <div style={{
      ...S.glassCard,
      padding: 24,
      position: "relative",
      overflow: "hidden",
      maxWidth: 680,
      width: "100%",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fb7185" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80" }} />
        </div>
        <span style={{ color: "#8d96b3", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>cuetronix.com/dashboard</span>
        <div style={{
          background: "rgba(74,222,128,0.15)",
          border: "1px solid rgba(74,222,128,0.3)",
          borderRadius: 999,
          padding: "2px 10px",
          fontSize: 11,
          color: "#4ade80",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s infinite" }} />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Revenue", value: "₹48,240", delta: "+12%", color: "#4ade80" },
          { label: "Sessions", value: "127", delta: "+8%", color: "#22d3ee" },
          { label: "Active Tables", value: "14/18", delta: "Live", color: "#a78bfa" },
          { label: "Bookings", value: "23", delta: "Today", color: "#f97316" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "12px 14px",
          }}>
            <div style={{ color: "#8d96b3", fontSize: 10, marginBottom: 4, letterSpacing: "0.04em" }}>{kpi.label.toUpperCase()}</div>
            <div style={{ color: "#f7f8ff", fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
            <div style={{ color: kpi.color, fontSize: 11, marginTop: 2 }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* Main content row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {/* Station grid */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 12,
        }}>
          <div style={{ color: "#b7bfd9", fontSize: 11, marginBottom: 10, fontWeight: 600 }}>LIVE STATIONS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
            {["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"].map((t, i) => (
              <div key={t} style={{
                background: i < 7 ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${i < 7 ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                padding: "6px 4px",
                textAlign: "center" as const,
                fontSize: 9,
                color: i < 7 ? "#c4b5fd" : "#8d96b3",
                fontWeight: 600,
              }}>{t}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "#a78bfa" }}>● 7 Active</span>
            <span style={{ fontSize: 10, color: "#8d96b3" }}>● 3 Free</span>
          </div>
        </div>

        {/* Revenue chart */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 12,
        }}>
          <div style={{ color: "#b7bfd9", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>REVENUE TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 54 }}>
            {[30, 45, 38, 60, 52, 72, 65, 80, 70, 90, 78, 95].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: i === 11
                    ? "linear-gradient(180deg, #22d3ee, #7c3aed)"
                    : "rgba(124,58,237,0.3)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
            ))}
          </div>
          <div style={{ color: "#4ade80", fontSize: 10, marginTop: 6 }}>+23% vs last week</div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Recent sessions */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 12,
        }}>
          <div style={{ color: "#b7bfd9", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>RECENT ACTIVITY</div>
          {[
            { name: "Rahul M.", table: "T3", time: "1h 24m", amt: "₹284" },
            { name: "Sam K.", table: "T7", time: "0h 42m", amt: "₹148" },
            { name: "Priya S.", table: "T1", time: "2h 10m", amt: "₹420" },
          ].map((s) => (
            <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ color: "#f7f8ff", fontSize: 11, fontWeight: 600 }}>{s.name}</div>
                <div style={{ color: "#8d96b3", fontSize: 10 }}>{s.table} · {s.time}</div>
              </div>
              <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.amt}</span>
            </div>
          ))}
        </div>

        {/* AI panel */}
        <div style={{
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 14,
          padding: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Bot size={12} color="#a78bfa" />
            <span style={{ color: "#a78bfa", fontSize: 11, fontWeight: 600 }}>AI ASSISTANT</span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#b7bfd9",
            fontSize: 10,
            lineHeight: 1.5,
            marginBottom: 6,
          }}>
            Revenue up 23% this week. Consider opening Table 11 on weekday evenings — historically 40% utilisation gap.
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(124,58,237,0.15)",
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 10,
            color: "#a78bfa",
          }}>
            <Sparkles size={10} />
            Powered by contextual business AI
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ pillar }: { pillar: typeof FEATURE_PILLARS[0] }) {
  const [hovered, setHovered] = useState(false);
  const Icon = pillar.icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.panelGlass,
        padding: 28,
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(124,58,237,0.3)"
          : "0 24px 64px rgba(0,0,0,0.24)",
        cursor: "default",
      }}
    >
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        background: pillar.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}>
        <Icon size={24} color="#fff" />
      </div>
      <h3 style={{ color: "#f7f8ff", fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: "'Poppins', sans-serif" }}>
        {pillar.title}
      </h3>
      <p style={{ color: "#8d96b3", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        {pillar.desc}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {pillar.bullets.map((b) => (
          <li key={b} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#b7bfd9", fontSize: 13 }}>
            <Check size={13} color="#7c3aed" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModuleTile({ mod }: { mod: typeof MODULES[0] }) {
  const [hovered, setHovered] = useState(false);
  const Icon = mod.icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: "18px 16px",
        transition: "all 0.25s ease",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <Icon size={20} color="#a78bfa" />
        <span style={{
          background: `${mod.tagColor}22`,
          border: `1px solid ${mod.tagColor}44`,
          color: mod.tagColor,
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 999,
          letterSpacing: "0.06em",
        }}>
          {mod.tag}
        </span>
      </div>
      <div style={{ color: "#f7f8ff", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{mod.name}</div>
      <div style={{ color: "#8d96b3", fontSize: 12 }}>{mod.desc}</div>
    </div>
  );
}

function FAQItem({ faq }: { faq: typeof FAQS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      ...S.panelGlass,
      borderRadius: 16,
      overflow: "hidden",
      transition: "all 0.2s ease",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left" as const,
          gap: 16,
        }}
      >
        <span style={{ color: "#f7f8ff", fontSize: 15, fontWeight: 600 }}>{faq.q}</span>
        <ChevronDown
          size={18}
          color="#8d96b3"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{ padding: "0 24px 20px", color: "#8d96b3", fontSize: 14, lineHeight: 1.7 }}>
          {faq.a}
        </div>
      )}
    </div>
  );
}

// ─── Main Landing Component ──────────────────────────────────────────────────

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div style={{ ...S.bgBase, fontFamily: "'Inter', 'DM Sans', sans-serif", color: "#f7f8ff" }} className="landing-root">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, padding: "12px 16px 0" }}>
        <header style={{
          ...S.headerShell,
          margin: 0,
          opacity: scrolled ? 1 : 0.97,
          padding: "0 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            {/* Logo */}
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
              }}>
                <Cpu size={16} color="#fff" />
              </div>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: "#f7f8ff", letterSpacing: "-0.02em" }}>
                Cuetronix
              </span>
              <span style={{
                background: "rgba(124,58,237,0.2)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "#a78bfa",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}>
                Multi-tenant SaaS
              </span>
            </Link>

            {/* Desktop nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
              {NAV_LINKS.map((link) => (
                link.href.startsWith("#") ? (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#b7bfd9",
                      fontSize: 14,
                      padding: "8px 14px",
                      cursor: "pointer",
                      borderRadius: 8,
                      transition: "color 0.2s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#b7bfd9")}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    style={{ color: "#b7bfd9", fontSize: 14, padding: "8px 14px", textDecoration: "none", borderRadius: 8, transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#b7bfd9")}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>

            {/* CTA group */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="header-cta">
              <Link to="/signin" style={{
                color: "#b7bfd9", fontSize: 13, textDecoration: "none", padding: "8px 16px",
                borderRadius: 10, transition: "all 0.2s", fontWeight: 500,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f7f8ff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#b7bfd9"; e.currentTarget.style.background = "transparent"; }}
              >
                Sign in
              </Link>
              <a
                href="https://demo.app.cuetronix.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...S.btnSecondary, padding: "9px 18px", fontSize: 13, borderRadius: 10 }}
              >
                <Play size={13} /> Demo
              </a>
              <Link to="/signup" style={{
                ...S.btnPrimary, padding: "9px 22px", fontSize: 13, borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
                boxShadow: "0 6px 24px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}>
                Start free trial
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              style={{ background: "transparent", border: "none", color: "#f7f8ff", cursor: "pointer", padding: 4 }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div style={{
              padding: "12px 0 16px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
              {NAV_LINKS.map((link) => (
                link.href.startsWith("#") ? (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    style={{ display: "block", width: "100%", textAlign: "left" as const, background: "transparent", border: "none", color: "#b7bfd9", fontSize: 15, padding: "10px 0", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    style={{ display: "block", color: "#b7bfd9", fontSize: 15, padding: "10px 0", textDecoration: "none" }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link to="/signin" style={{ ...S.btnSecondary, flex: 1, justifyContent: "center", fontSize: 14 }}>Sign in</Link>
                <Link to="/signup" style={{ ...S.btnPrimary, flex: 1, justifyContent: "center", fontSize: 14 }}>Free trial</Link>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "100px 24px 120px" }}>
        <GlowOrb color="#7c3aed" size={700} top={-250} left={-200} opacity={0.16} />
        <GlowOrb color="#22d3ee" size={500} top={30} right={-150} opacity={0.10} />
        <GlowOrb color="#a78bfa" size={350} top={300} left="50%" opacity={0.06} />

        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(34,211,238,0.08))",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: 999,
              padding: "8px 22px",
              fontSize: 13,
              color: "#a78bfa",
              fontWeight: 500,
              backdropFilter: "blur(12px)",
            }}>
              <Sparkles size={13} />
              White-label multi-tenant SaaS for gaming clubs
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Headline */}
          <h1
            className="gradient-text-animated"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "clamp(2.8rem, 5.5vw, 5.2rem)",
              fontWeight: 800,
              textAlign: "center" as const,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              marginBottom: 28,
              background: "linear-gradient(135deg, #f0eeff 0%, #c4b5fd 35%, #67e8f9 65%, #f0eeff 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The operating system<br />for modern gaming clubs
          </h1>

          {/* Sub */}
          <p style={{
            textAlign: "center" as const,
            color: "#8d96b3",
            fontSize: "clamp(1.05rem, 1.8vw, 1.22rem)",
            maxWidth: 620,
            margin: "0 auto 44px",
            lineHeight: 1.75,
          }}>
            One browser-based control center for sessions, billing, bookings, inventory,
            staff, tournaments, analytics, and every customer touchpoint — white-label from day one.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 14, justifyContent: "center", marginBottom: 52 }}>
            <Link to="/signup" style={{
              ...S.btnPrimary,
              padding: "15px 34px",
              fontSize: 16,
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)",
              boxShadow: "0 10px 36px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>
              Start free trial <ArrowRight size={16} />
            </Link>
            <a
              href="https://demo.app.cuetronix.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...S.btnSecondary, padding: "15px 34px", fontSize: 16 }}
            >
              <Play size={16} /> Try live demo
            </a>
          </div>

          {/* Proof badges */}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, justifyContent: "center", marginBottom: 72 }}>
            {[
              { label: "Multi-tenant isolation", icon: Lock },
              { label: "White-label theming", icon: Globe },
              { label: "Stripe · Razorpay · Square", icon: CreditCard },
              { label: "AI-powered insights", icon: Sparkles },
            ].map(({ label, icon: Icon }) => (
              <div key={label} style={{
                ...S.statChip,
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(12px)",
              }}>
                <Icon size={12} color="#7c3aed" />
                {label}
              </div>
            ))}
          </div>

          {/* Dashboard mockup */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute",
                inset: -2,
                borderRadius: 32,
                background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(34,211,238,0.35))",
                filter: "blur(20px)",
                opacity: 0.5,
                zIndex: -1,
              }} />
              <HeroDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted-by strip ──────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 40px", position: "relative" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ textAlign: "center" as const, color: "#5a6280", fontSize: 12, marginBottom: 28, letterSpacing: "0.1em", fontWeight: 500 }}>
            BUILT FOR CLUBS THAT DEMAND MORE
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: 32, alignItems: "center", opacity: 0.5 }}>
            {["Snooker Lounge", "8-Ball Arena", "CueMasters", "The Pool House", "GameZone HQ", "Billiards Co."].map((name) => (
              <span key={name} style={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 700, color: "#8d96b3", letterSpacing: "-0.01em" }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof / KPI Strip ────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 80px", position: "relative" }}>
        <div style={S.sectionDivider} />
        <div style={{ maxWidth: 1100, margin: "60px auto 0" }}>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 13, marginBottom: 36, letterSpacing: "0.08em" }}>
            PLATFORM TARGETS &amp; CAPABILITIES
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {PROOF_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} style={{
                  ...S.panelGlass,
                  padding: "24px 20px",
                  textAlign: "center" as const,
                }}>
                  <Icon size={22} color={stat.color} style={{ margin: "0 auto 10px" }} />
                  <div style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: stat.color,
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>{stat.value}</div>
                  <div style={{ color: "#8d96b3", fontSize: 12 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature Architecture ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", position: "relative" }}>
        <GlowOrb color="#7c3aed" size={500} top="20%" left="-10%" opacity={0.08} />

        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionLabel>Platform architecture</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Everything your club runs on,<br />in one system
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 560, margin: "0 auto 56px", lineHeight: 1.6 }}>
            Six operational pillars covering every workflow from first session to final report — fully integrated, fully real-time.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {FEATURE_PILLARS.map((pillar) => <FeatureCard key={pillar.title} pillar={pillar} />)}
          </div>
        </div>
      </section>

      {/* ── Modules Grid ─────────────────────────────────────────────────── */}
      <section id="modules" style={{ padding: "80px 24px", background: "rgba(10,14,28,0.4)", position: "relative" }}>
        <div style={S.sectionDivider} />
        <div style={{ maxWidth: 1160, margin: "60px auto 0" }}>
          <SectionLabel>Full module matrix</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Sixteen first-class modules
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 540, margin: "0 auto 52px", lineHeight: 1.6 }}>
            Every module in Cuetronix is a purpose-built workspace. Nothing generic, nothing bolted on.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {MODULES.map((mod) => <ModuleTile key={mod.name} mod={mod} />)}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" as const, marginTop: 32 }}>
            {[
              { label: "Core", color: "#7c3aed" },
              { label: "Advanced", color: "#22d3ee" },
              { label: "Plan-gated", color: "#f97316" },
              { label: "Public-facing", color: "#4ade80" },
              { label: "Platform", color: "#fb7185" },
            ].map(({ label, color }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "#8d96b3", fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── White-label ──────────────────────────────────────────────────── */}
      <section id="whitelabel" style={{ padding: "80px 24px", position: "relative" }}>
        <GlowOrb color="#f97316" size={400} top="30%" right="-5%" opacity={0.07} />

        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionLabel>White-label &amp; branding</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Your brand, everywhere<br />your customers interact
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center", marginTop: 56 }} className="wl-grid">
            {/* Controls */}
            <div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
                {[
                  { label: "Logo & Favicon", desc: "Upload your club logo and browser favicon — applied instantly across all public pages." },
                  { label: "Colours & Fonts", desc: "Configure primary, secondary, and accent colours. Choose from Poppins, Inter, DM Sans, and more." },
                  { label: "Public Pages", desc: "Booking, tournaments, and station pages automatically inherit your brand theme." },
                  { label: "Customer Portal", desc: "Your customers experience a portal branded entirely as your club — no Cuetronix mention unless you choose to show it." },
                  { label: "White-label Badge Control", desc: "Plan-based logic controls whether the 'powered by' badge is visible on public-facing surfaces." },
                ].map((item) => (
                  <div key={item.label} style={{
                    ...S.panelGlass,
                    padding: "18px 22px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    borderRadius: 16,
                  }}>
                    <Check size={18} color="#7c3aed" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: "#f7f8ff", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ color: "#8d96b3", fontSize: 13, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview panel */}
            <div style={{ ...S.glassCard, padding: 24, position: "relative" }}>
              <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #f97316, #fbbf24)" }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: "#f7f8ff" }}>Billiards Palace</span>
                <span style={{ fontSize: 11, color: "#8d96b3", marginLeft: "auto" }}>Your club brand</span>
              </div>

              {/* Mock public booking card */}
              <div style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}>
                <div style={{ color: "#f97316", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>BOOK A TABLE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {["Table 1 – ₹120/hr", "Table 2 – ₹120/hr", "Table 3 – ₹140/hr", "Table 4 – BOOKED"].map((t) => (
                    <div key={t} style={{
                      background: t.includes("BOOKED") ? "rgba(255,255,255,0.03)" : "rgba(249,115,22,0.15)",
                      border: `1px solid ${t.includes("BOOKED") ? "rgba(255,255,255,0.06)" : "rgba(249,115,22,0.3)"}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 11,
                      color: t.includes("BOOKED") ? "#8d96b3" : "#fbbf24",
                    }}>{t}</div>
                  ))}
                </div>
                <div style={{ ...S.btnPrimary, background: "linear-gradient(135deg, #f97316, #fbbf24)", boxShadow: "0 4px 16px rgba(249,115,22,0.3)", fontSize: 13, padding: "10px 0", justifyContent: "center" }}>
                  Confirm Booking
                </div>
              </div>

              {/* Mock receipt */}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: 14,
              }}>
                <div style={{ color: "#b7bfd9", fontSize: 10, marginBottom: 8 }}>RECEIPT PREVIEW</div>
                {[
                  ["Table 3 — 2h 10m", "₹307"],
                  ["Beverages ×2", "₹80"],
                  ["Discount (Loyalty)", "−₹45"],
                ].map(([item, amt]) => (
                  <div key={item} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8d96b3", marginBottom: 4 }}>
                    <span>{item}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#f7f8ff" }}>{amt}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#f97316" }}>
                  <span>Total</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹342</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Section ─────────────────────────────────────────────────── */}
      <section id="demo" style={{ padding: "80px 24px", background: "rgba(10,14,28,0.4)", position: "relative" }}>
        <div style={S.sectionDivider} />
        <GlowOrb color="#7c3aed" size={500} top="0%" left="30%" opacity={0.10} />

        <div style={{ maxWidth: 900, margin: "60px auto 0", textAlign: "center" as const }}>
          <SectionLabel>Live sandbox</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Explore the product before<br />you create an account
          </h2>
          <p style={{ color: "#8d96b3", fontSize: 16, maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Launch a live sandbox tenant and explore dashboards, POS, bookings, staff tools, reports, and AI flows — no signup friction required.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
            {[
              { icon: Zap, title: "One-click access", desc: "Instant login to a fully seeded demo tenant at demo.app.cuetronix.com", color: "#22d3ee" },
              { icon: Database, title: "Realistic data", desc: "Seeded stations, products, bills, customers, staff, tournaments, and expenses", color: "#a78bfa" },
              { icon: Clock, title: "Auto-reset", desc: "Demo environment resets automatically every 24 hours for a fresh experience", color: "#4ade80" },
              { icon: Eye, title: "Full ownership", desc: "See every module and workflow in action before committing to a plan", color: "#f97316" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} style={{ ...S.panelGlass, padding: 24, borderRadius: 20 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: `${color}22`,
                  border: `1px solid ${color}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ color: "#f7f8ff", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <div style={{ color: "#8d96b3", fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          <a
            href="https://demo.app.cuetronix.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...S.btnPrimary, padding: "16px 40px", fontSize: 16, display: "inline-flex" }}
          >
            <Play size={18} /> Try live demo <ExternalLink size={14} />
          </a>
          <p style={{ color: "#8d96b3", fontSize: 12, marginTop: 14 }}>
            No account required · Resets every 24 hours · Full module access
          </p>
        </div>
      </section>

      {/* ── Infrastructure ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", position: "relative" }}>
        <GlowOrb color="#22d3ee" size={450} top="20%" right="-5%" opacity={0.08} />

        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionLabel>Infrastructure &amp; payments</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Built for real-world club operations
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start", marginTop: 56 }} className="infra-grid">
            {/* Architecture bullets */}
            <div>
              <h3 style={{ color: "#a78bfa", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 24 }}>
                ARCHITECTURE PRINCIPLES
              </h3>
              {[
                { icon: Lock, title: "Tenant-isolated data", desc: "Row-level security with Supabase RLS, JWT claims, and per-tenant workspace isolation." },
                { icon: Globe, title: "Global subdomain routing", desc: "Public pages, customer portal, and app shell routed across slug.app.cuetronix.com subdomains with tenant-aware theming." },
                { icon: CreditCard, title: "Regional payment flexibility", desc: "Stripe for international, Razorpay for South Asia, Square for additional flows — configured per platform vs tenant use case." },
                { icon: Zap, title: "Edge-deployed performance", desc: "Vercel edge functions with Cloudflare CDN, targeting 99.9% uptime and 2.5-second SPA shell loads." },
                { icon: Shield, title: "Enterprise-grade security", desc: "Sentry error monitoring, PostHog analytics, Upstash Redis rate limiting, and Resend for transactional email." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(124,58,237,0.12)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={18} color="#a78bfa" />
                    </div>
                    <div>
                      <div style={{ color: "#f7f8ff", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ color: "#8d96b3", fontSize: 13, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stack cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {INFRA_STACK.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.name} style={{
                    ...S.panelGlass,
                    padding: "18px 16px",
                    borderRadius: 16,
                  }}>
                    <Icon size={20} color="#22d3ee" style={{ marginBottom: 10 }} />
                    <div style={{ color: "#f7f8ff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ color: "#8d96b3", fontSize: 12 }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "rgba(10,14,28,0.4)", position: "relative" }}>
        <div style={S.sectionDivider} />
        <GlowOrb color="#7c3aed" size={600} top="-30%" left="20%" opacity={0.10} />

        <div style={{ maxWidth: 820, margin: "60px auto 0", textAlign: "center" as const }}>
          <SectionLabel>Get started</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Launch your club workspace<br />in minutes
          </h2>
          <p style={{ color: "#8d96b3", fontSize: 16, maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Start with friction-light onboarding — configure your brand, invite staff, and go from signup to first session without the overhead of traditional venue software.
          </p>

          <div style={{
            ...S.glassCard,
            padding: "48px 40px",
            maxWidth: 680,
            margin: "0 auto 40px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.08) 100%)",
              borderRadius: "inherit",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>
                {[
                  { step: "01", title: "Sign up", desc: "Create your account in 60 seconds" },
                  { step: "02", title: "Configure", desc: "Brand, staff, stations, products" },
                  { step: "03", title: "Go live", desc: "Accept sessions and bookings today" },
                ].map((s) => (
                  <div key={s.step} style={{ textAlign: "center" as const }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#7c3aed",
                      opacity: 0.5,
                      lineHeight: 1,
                      marginBottom: 10,
                    }}>{s.step}</div>
                    <div style={{ color: "#f7f8ff", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{s.title}</div>
                    <div style={{ color: "#8d96b3", fontSize: 13 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" as const }}>
                <Link to="/signup" style={{
                  ...S.btnPrimary, padding: "15px 36px", fontSize: 16,
                  background: "linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)",
                  boxShadow: "0 10px 36px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}>
                  Start free trial <ArrowRight size={16} />
                </Link>
                <Link to="/contact" style={{ ...S.btnSecondary, padding: "15px 30px", fontSize: 15 }}>
                  Book a walkthrough
                </Link>
              </div>
              <div style={{ marginTop: 16 }}>
                <Link to="/pricing" style={{ color: "#a78bfa", fontSize: 14, textDecoration: "none" }}>
                  View pricing plans →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", position: "relative" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <SectionLabel>Common questions</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 48,
            color: "#f7f8ff",
          }}>
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {FAQS.map((faq) => <FAQItem key={faq.q} faq={faq} />)}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={S.footerShell}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr", gap: 40 }} className="footer-grid">

            {/* Column 1 – Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Cpu size={16} color="#fff" />
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: "#f7f8ff" }}>Cuetronix</span>
              </div>
              <p style={{ color: "#8d96b3", fontSize: 13, lineHeight: 1.7, marginBottom: 16, maxWidth: 260 }}>
                The operating system for modern gaming clubs — sessions, billing, bookings, staff, and every customer touchpoint in one branded platform.
              </p>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.25)",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 12,
                color: "#a78bfa",
                marginBottom: 14,
              }}>
                <Cpu size={11} />
                Powered by Cuephoria Tech
              </div>
              <div style={{ color: "#8d96b3", fontSize: 12 }}>
                <a href="mailto:support@cuetronix.com" style={{ color: "#8d96b3", textDecoration: "none" }}>
                  support@cuetronix.com
                </a>
              </div>
            </div>

            {/* Column 2 – Product */}
            <div>
              <div style={{ color: "#f7f8ff", fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>PRODUCT</div>
              {[
                { label: "Dashboard", href: "/signin" },
                { label: "POS", href: "/signin" },
                { label: "Bookings", href: "/signin" },
                { label: "Customer Portal", href: "/signin" },
                { label: "Reports", href: "/signin" },
                { label: "AI Assistant", href: "/signin" },
              ].map((l) => (
                <Link key={l.label} to={l.href} style={{ display: "block", color: "#8d96b3", fontSize: 13, marginBottom: 10, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8d96b3")}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Column 3 – Platform */}
            <div>
              <div style={{ color: "#f7f8ff", fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>PLATFORM</div>
              {[
                { label: "Multi-tenant Architecture", href: "#features" },
                { label: "White-label Theming", href: "#whitelabel" },
                { label: "Payments", href: "#" },
                { label: "Security", href: "#" },
                { label: "Demo Environment", href: "#demo" },
                { label: "API", href: "#" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ display: "block", color: "#8d96b3", fontSize: 13, marginBottom: 10, textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8d96b3")}
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Column 4 – Legal */}
            <div>
              <div style={{ color: "#f7f8ff", fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>LEGAL</div>
              {[
                { label: "Pricing", href: "/pricing" },
                { label: "Contact", href: "/contact" },
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Terms & Conditions", href: "/terms-and-conditions" },
                { label: "Refund Policy", href: "/refund-policy" },
              ].map((l) => (
                <Link key={l.label} to={l.href} style={{ display: "block", color: "#8d96b3", fontSize: 13, marginBottom: 10, textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8d96b3")}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Column 5 – CTA */}
            <div>
              <div style={{ color: "#f7f8ff", fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>GET STARTED</div>
              <p style={{ color: "#8d96b3", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                Ready to modernize your club operations? Start with a free trial or explore the live demo first.
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                <Link to="/signup" style={{ ...S.btnPrimary, justifyContent: "center", fontSize: 14 }}>
                  Start free trial
                </Link>
                <a
                  href="https://demo.app.cuetronix.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...S.btnSecondary, justifyContent: "center", fontSize: 14 }}
                >
                  <Play size={13} /> Try live demo
                </a>
              </div>
            </div>
          </div>

          {/* Footer bottom bar */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            marginTop: 48,
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap" as const,
            gap: 16,
          }}>
            <p style={{ color: "#8d96b3", fontSize: 13 }}>
              © 2026 Cuetronix. Powered by{" "}
              <span style={{ color: "#a78bfa" }}>Cuephoria Tech</span>.
            </p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
              {[
                { label: "Privacy", href: "/privacy-policy" },
                { label: "Terms", href: "/terms-and-conditions" },
                { label: "Refunds", href: "/refund-policy" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <Link key={l.label} to={l.href} style={{ color: "#8d96b3", fontSize: 13, textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f7f8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8d96b3")}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
