import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Monitor, Users, BarChart3, CalendarDays, Trophy,
  Package, Settings, Globe, Zap, Shield,
  ChevronDown, ArrowRight, Play, Check, Layers,
  CreditCard, Database, Bot, Clock, Eye, Star,
  Sparkles, Menu, X, ExternalLink, LayoutDashboard,
  Receipt, UserCircle, BarChart2,
  Banknote, FileText, PieChart, Cpu,
  TrendingUp, HeartHandshake, Timer, Quote,
  AlertTriangle, ThumbsUp,
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
  { label: "Features", href: "#features" },
  { label: "How it helps", href: "#pain-points" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const PROOF_STATS = [
  { value: "40%", label: "Less revenue leakage", icon: TrendingUp, color: "#4ade80" },
  { value: "3x", label: "Faster table turnover", icon: Timer, color: "#22d3ee" },
  { value: "16+", label: "Built-in modules", icon: Layers, color: "#a78bfa" },
  { value: "60s", label: "Onboarding to first session", icon: Zap, color: "#f97316" },
  { value: "24/7", label: "Online bookings", icon: CalendarDays, color: "#fbbf24" },
  { value: "100%", label: "Branded for your club", icon: Globe, color: "#7c3aed" },
];

const FEATURE_PILLARS = [
  {
    icon: Monitor,
    gradient: "linear-gradient(135deg, #7c3aed, #22d3ee)",
    title: "Table Sessions & Billing",
    desc: "Start a timer when customers sit down, auto-calculate the bill, and collect payment — no more guesswork or forgotten charges.",
    bullets: ["Live table timer on every station", "Auto-pricing per minute or per hour", "Split bills, group sessions, add-ons", "Digital receipts via WhatsApp or SMS"],
  },
  {
    icon: CalendarDays,
    gradient: "linear-gradient(135deg, #f97316, #fbbf24)",
    title: "Online Bookings & Tournaments",
    desc: "Let customers book tables from their phone and register for weekend tournaments — your club stays busy even when you're not at the counter.",
    bullets: ["Public booking page with your club brand", "Weekend & league tournament brackets", "Automatic slot conflict prevention", "Online payment at time of booking"],
  },
  {
    icon: Package,
    gradient: "linear-gradient(135deg, #22d3ee, #4ade80)",
    title: "Snacks, Drinks & Inventory",
    desc: "Sell beverages and snacks alongside table time, track what's running low, and never run out of chalk or cue tips again.",
    bullets: ["Menu items sold at the counter or table", "Low-stock alerts before you run out", "Cost & profit tracking per item", "Integrated with the session bill"],
  },
  {
    icon: Users,
    gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    title: "Customer Loyalty & Portal",
    desc: "Recognise your regulars. Give them loyalty points, exclusive offers, and a portal where they can check their balance and book tables.",
    bullets: ["Loyalty points earned per session", "Member-only offers & discounts", "Customer self-serve portal", "Birthday & milestone rewards"],
  },
  {
    icon: Shield,
    gradient: "linear-gradient(135deg, #fb7185, #f97316)",
    title: "Staff, Cash & Expenses",
    desc: "Track who's working, manage shifts, keep the cash register balanced, and log every expense — from rent to equipment repairs.",
    bullets: ["Staff roles (manager, cashier, floor)", "Shift tracking & leave requests", "Daily cash register open / close", "Expense logging by category"],
  },
  {
    icon: BarChart3,
    gradient: "linear-gradient(135deg, #fbbf24, #f97316)",
    title: "Reports, Analytics & AI",
    desc: "See exactly how your club is performing — revenue by table, peak hours, customer retention — and get AI suggestions to grow faster.",
    bullets: ["Revenue reports by day, week, month", "Peak hour & table utilisation charts", "Export to Excel or PDF anytime", "AI tips: 'Open Table 5 on Thursdays'"],
  },
];

const TESTIMONIALS = [
  {
    name: "Arjun Mehta",
    role: "Owner, Cue Masters Lounge",
    location: "Mumbai, India",
    avatar: "AM",
    color: "#7c3aed",
    quote: "We used to track sessions on paper and lost at least ₹15,000 a month to forgotten charges. Cuetronix caught every minute from day one. Our revenue jumped 32% in the first quarter.",
    stat: "32% revenue increase",
  },
  {
    name: "James O'Sullivan",
    role: "Manager, The 8-Ball Club",
    location: "London, UK",
    avatar: "JO",
    color: "#22d3ee",
    quote: "Online bookings alone changed the game. We went from empty Tuesday evenings to fully booked within three weeks. Customers love booking from their phone.",
    stat: "3x weekday bookings",
  },
  {
    name: "Priya Ramaswamy",
    role: "Co-owner, Break Point Billiards",
    location: "Bangalore, India",
    avatar: "PR",
    color: "#f97316",
    quote: "The loyalty programme keeps our regulars coming back. We give them points per session and exclusive offers. Customer retention went from 40% to over 70%.",
    stat: "70% customer retention",
  },
  {
    name: "Tom Nguyen",
    role: "Founder, Rack'em Pool Hall",
    location: "Melbourne, Australia",
    avatar: "TN",
    color: "#4ade80",
    quote: "I run two venues now and manage everything from one dashboard. Staff scheduling, inventory, daily cash reports — I finally have visibility into what's happening at both locations.",
    stat: "2 venues, 1 dashboard",
  },
];

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    pain: "Tracking sessions on paper or a whiteboard",
    solution: "Digital timers on every table — auto-billing, zero missed charges",
    color: "#fb7185",
  },
  {
    icon: AlertTriangle,
    pain: "No idea which tables actually make money",
    solution: "Revenue breakdown by table, day, and time slot in real-time reports",
    color: "#fb7185",
  },
  {
    icon: AlertTriangle,
    pain: "Customers can't book ahead — they just walk in and leave if it's full",
    solution: "Online booking page branded with your club — available 24/7 on any device",
    color: "#fb7185",
  },
  {
    icon: AlertTriangle,
    pain: "No loyalty programme — regulars leave for the new place down the road",
    solution: "Points per session, member discounts, exclusive offers, self-serve portal",
    color: "#fb7185",
  },
  {
    icon: AlertTriangle,
    pain: "Cash goes missing and you can't figure out where",
    solution: "Cash register open/close workflow with daily reconciliation & expense tracking",
    color: "#fb7185",
  },
  {
    icon: AlertTriangle,
    pain: "Staff schedule is a WhatsApp group and it's chaos",
    solution: "Shift management, leave requests, role-based access — all in one place",
    color: "#fb7185",
  },
];

const MODULES = [
  { icon: LayoutDashboard, name: "Dashboard", desc: "See everything at a glance", tag: "Core", tagColor: "#7c3aed" },
  { icon: Receipt, name: "Billing & POS", desc: "Ring up sessions and sales", tag: "Core", tagColor: "#7c3aed" },
  { icon: Monitor, name: "Table Management", desc: "Live timers on every table", tag: "Core", tagColor: "#7c3aed" },
  { icon: Package, name: "Snacks & Inventory", desc: "Track stock and sell at counter", tag: "Core", tagColor: "#7c3aed" },
  { icon: Users, name: "Customer CRM", desc: "Know every regular by name", tag: "Core", tagColor: "#7c3aed" },
  { icon: BarChart2, name: "Reports", desc: "Revenue, sessions, peak hours", tag: "Core", tagColor: "#7c3aed" },
  { icon: CalendarDays, name: "Online Bookings", desc: "24/7 table reservations online", tag: "Growth", tagColor: "#22d3ee" },
  { icon: Shield, name: "Staff Management", desc: "Shifts, roles & attendance", tag: "Growth", tagColor: "#22d3ee" },
  { icon: Trophy, name: "Tournaments", desc: "Brackets, registrations & prizes", tag: "Growth", tagColor: "#22d3ee" },
  { icon: Banknote, name: "Cash Register", desc: "Daily opens, closes & floats", tag: "Growth", tagColor: "#22d3ee" },
  { icon: FileText, name: "Expenses", desc: "Track rent, repairs, supplies", tag: "Growth", tagColor: "#22d3ee" },
  { icon: PieChart, name: "Investor Reports", desc: "P&L for partners & investors", tag: "Pro", tagColor: "#f97316" },
  { icon: Bot, name: "AI Assistant", desc: "Smart tips to grow revenue", tag: "Pro", tagColor: "#f97316" },
  { icon: Settings, name: "Club Settings", desc: "Logo, colours, pricing rules", tag: "Core", tagColor: "#7c3aed" },
  { icon: UserCircle, name: "Customer Portal", desc: "Customers book & check loyalty", tag: "Public", tagColor: "#4ade80" },
  { icon: HeartHandshake, name: "Loyalty Programme", desc: "Points, rewards & retention", tag: "Growth", tagColor: "#22d3ee" },
];

const FAQS = [
  {
    q: "I run a small snooker club with 6 tables — is this for me?",
    a: "Absolutely. Cuetronix works for clubs of any size — from 4-table pool halls to 30-table snooker centres. You only pay for what you need, and the setup takes less than 5 minutes. Most small club owners see immediate value from session tracking and online bookings alone.",
  },
  {
    q: "Can my customers book tables online?",
    a: "Yes! You get a public booking page branded with your club name, logo, and colours. Customers can see available slots, pick a table, and pay online — all from their phone. No app download needed. You'll get notified of every booking instantly.",
  },
  {
    q: "How does the loyalty programme work?",
    a: "Every time a customer plays a session, they earn loyalty points automatically. You decide how many points per rupee or per hour. Customers can see their balance in their personal portal, redeem points for discounts, and receive exclusive member offers you create.",
  },
  {
    q: "What if I already track things on paper — is it hard to switch?",
    a: "Not at all. Most clubs are fully up and running within an hour. Add your tables, set your pricing per hour, and start a session with one tap. There's no complicated setup. If you can use WhatsApp, you can use Cuetronix.",
  },
  {
    q: "Will it look like my club, or like 'Cuetronix'?",
    a: "It looks like your club. Upload your logo, choose your colours, and every page your customers see — bookings, receipts, the portal — is branded entirely as your business. On higher plans, even the 'powered by' badge disappears completely.",
  },
  {
    q: "Can I see a live demo before signing up?",
    a: "Yes. Visit demo.app.cuetronix.com for instant access to a fully loaded demo club with tables, bookings, customers, tournaments, and more — no account needed. The demo resets every 24 hours so you always see a fresh experience.",
  },
  {
    q: "How does billing work — do I pay per table?",
    a: "No per-table charges. Cuetronix uses simple monthly plans based on features. All plans include unlimited sessions, unlimited customers, and core modules. Advanced features like tournaments, AI, and investor reports are available on higher tiers.",
  },
  {
    q: "Do you support payments in India and internationally?",
    a: "Yes. We support Razorpay for Indian clubs, Stripe for international venues, and Square for additional regions. Your customers can pay via UPI, cards, wallets, or bank transfers depending on the gateway — all integrated directly into the booking and billing flow.",
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
                For snooker &amp; pool clubs
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
              Trusted by snooker &amp; pool clubs across 4 countries
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
            Run your snooker club<br />like a modern business
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
            Stop losing revenue to pen-and-paper tracking. Cuetronix gives your snooker, pool,
            or 8-ball club live table timers, online bookings, customer loyalty, staff management,
            and real-time reports — all from your browser, branded as your club.
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
              { label: "No missed charges ever", icon: Timer },
              { label: "Online bookings 24/7", icon: CalendarDays },
              { label: "Branded for your club", icon: Globe },
              { label: "AI tips to grow revenue", icon: Sparkles },
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
            POWERING CLUBS ACROSS INDIA, UK, UAE & AUSTRALIA
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: 32, alignItems: "center", opacity: 0.5 }}>
            {["Cue Masters Lounge", "The 8-Ball Club", "Break Point Billiards", "Rack'em Pool Hall", "Century Snooker", "The Cue Room"].map((name) => (
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
            WHAT CLUB OWNERS ARE SEEING
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
          <SectionLabel>Everything you need</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            One platform to run<br />your entire club
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 560, margin: "0 auto 56px", lineHeight: 1.6 }}>
            From the moment a customer walks in to the end-of-month report — every part of your snooker or pool club, handled.
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
          <SectionLabel>Built for clubs</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Every tool your club needs,<br />nothing it doesn't
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 540, margin: "0 auto 52px", lineHeight: 1.6 }}>
            16 modules designed specifically for snooker, pool, and 8-ball venues — not generic "business" software adapted to fit.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {MODULES.map((mod) => <ModuleTile key={mod.name} mod={mod} />)}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" as const, marginTop: 32 }}>
            {[
              { label: "Core", color: "#7c3aed" },
              { label: "Growth", color: "#22d3ee" },
              { label: "Pro", color: "#f97316" },
              { label: "Public", color: "#4ade80" },
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
          <SectionLabel>Your brand, your way</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Customers see your club name,<br />not ours
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center", marginTop: 56 }} className="wl-grid">
            {/* Controls */}
            <div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
                {[
                  { label: "Your logo everywhere", desc: "Upload your club logo and it appears on booking pages, receipts, the customer portal, and the browser tab." },
                  { label: "Your colours & style", desc: "Pick your brand colours and they flow through every screen your customers interact with." },
                  { label: "Branded booking page", desc: "When customers visit your booking link, it looks and feels like your club — not a generic software tool." },
                  { label: "Customer portal with your name", desc: "Your regulars log in to 'Cue Masters Lounge,' not 'Cuetronix.' It's their club experience, your brand." },
                  { label: "Remove our badge on Pro", desc: "On higher plans, even the 'powered by Cuetronix' text disappears — it's 100% your brand." },
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
          <SectionLabel>Try it now</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            See how it works<br />before you sign up
          </h2>
          <p style={{ color: "#8d96b3", fontSize: 16, maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Explore a fully loaded demo club — tables, bookings, customers, tournaments, and reports — all with realistic data. No account needed.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
            {[
              { icon: Zap, title: "One-click access", desc: "Open the demo and you're inside a working club dashboard — no sign-up, no email", color: "#22d3ee" },
              { icon: Database, title: "Real club data", desc: "Tables, customers, sessions, inventory, staff, and tournaments — all pre-loaded", color: "#a78bfa" },
              { icon: Clock, title: "Fresh every day", desc: "The demo resets every 24 hours, so you can experiment freely without breaking anything", color: "#4ade80" },
              { icon: Eye, title: "See everything", desc: "Every module, every report, every feature — try it all before you commit to a plan", color: "#f97316" },
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

      {/* ── Pain Points: Before / After ──────────────────────────────────── */}
      <section id="pain-points" style={{ padding: "80px 24px", position: "relative" }}>
        <GlowOrb color="#fb7185" size={450} top="10%" left="-8%" opacity={0.08} />
        <GlowOrb color="#22d3ee" size={350} top="60%" right="-5%" opacity={0.06} />

        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <SectionLabel>Sound familiar?</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Real problems club owners<br />deal with every day
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 580, margin: "0 auto 56px", lineHeight: 1.6 }}>
            If you recognise even two of these, Cuetronix will pay for itself in the first month.
          </p>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
            {PAIN_POINTS.map((pp) => (
              <div key={pp.pain} style={{
                ...S.panelGlass,
                borderRadius: 18,
                padding: "24px 28px",
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 24,
                alignItems: "center",
              }} className="pain-row">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <AlertTriangle size={16} color="#fb7185" />
                  </div>
                  <div>
                    <div style={{ color: "#fb7185", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>THE PROBLEM</div>
                    <div style={{ color: "#f7f8ff", fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{pp.pain}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowRight size={20} color="#7c3aed" />
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <ThumbsUp size={16} color="#4ade80" />
                  </div>
                  <div>
                    <div style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>WITH CUETRONIX</div>
                    <div style={{ color: "#f7f8ff", fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{pp.solution}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: "80px 24px", background: "rgba(10,14,28,0.4)", position: "relative" }}>
        <div style={S.sectionDivider} />
        <GlowOrb color="#7c3aed" size={400} top="20%" right="10%" opacity={0.07} />

        <div style={{ maxWidth: 1160, margin: "60px auto 0" }}>
          <SectionLabel>Club owners love it</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 16,
            color: "#f7f8ff",
          }}>
            Hear from clubs already<br />running on Cuetronix
          </h2>
          <p style={{ textAlign: "center" as const, color: "#8d96b3", fontSize: 16, maxWidth: 560, margin: "0 auto 56px", lineHeight: 1.6 }}>
            From single-venue pool halls to multi-location snooker chains — here's what our club owners say.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{
                ...S.panelGlass,
                padding: 28,
                borderRadius: 22,
                display: "flex",
                flexDirection: "column" as const,
                justifyContent: "space-between",
              }}>
                <div>
                  <Quote size={28} color={t.color} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <p style={{ color: "#e0e4f0", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                    "{t.quote}"
                  </p>
                </div>

                <div>
                  <div style={{
                    background: `${t.color}15`,
                    border: `1px solid ${t.color}30`,
                    borderRadius: 10,
                    padding: "8px 14px",
                    marginBottom: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <TrendingUp size={13} color={t.color} />
                    <span style={{ color: t.color, fontSize: 12, fontWeight: 700 }}>{t.stat}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "#fff",
                    }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ color: "#f7f8ff", fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                      <div style={{ color: "#8d96b3", fontSize: 12 }}>{t.role}</div>
                      <div style={{ color: "#6b7394", fontSize: 11 }}>{t.location}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rating strip */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
            marginTop: 48, padding: "16px 24px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, width: "fit-content", margin: "48px auto 0",
          }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4,5].map((i) => <Star key={i} size={16} fill="#fbbf24" color="#fbbf24" />)}
            </div>
            <span style={{ color: "#fbbf24", fontSize: 15, fontWeight: 800 }}>4.9</span>
            <span style={{ color: "#8d96b3", fontSize: 13 }}>average rating from club owners</span>
          </div>
        </div>
      </section>

      {/* ── Why Snooker & Pool Clubs Choose Cuetronix ─────────────────── */}
      <section style={{ padding: "80px 24px", position: "relative" }}>
        <GlowOrb color="#22d3ee" size={400} top="30%" left="-5%" opacity={0.07} />

        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <SectionLabel>Why cuetronix</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 56,
            color: "#f7f8ff",
          }}>
            Built specifically for cue-sport venues
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              {
                icon: Timer, color: "#7c3aed",
                title: "Made for timed sessions",
                desc: "Unlike generic POS systems, Cuetronix understands that your revenue is time-based. Every table has a live timer, per-minute or per-hour pricing, and automatic bill calculation.",
              },
              {
                icon: Globe, color: "#22d3ee",
                title: "Your brand, not ours",
                desc: "Upload your logo, pick your colours, and every page your customers see — bookings, receipts, the portal — is branded as your club. On Pro plans, even our name disappears.",
              },
              {
                icon: Users, color: "#f97316",
                title: "Built for regulars",
                desc: "Cue-sport clubs thrive on regulars. That's why loyalty points, member offers, birthday rewards, and a customer portal aren't add-ons — they're baked right in.",
              },
              {
                icon: Trophy, color: "#fbbf24",
                title: "Tournaments are first-class",
                desc: "Weekly 8-ball tournaments, league nights, snooker championships — create brackets, handle registrations, collect entry fees, and publish results, all from one screen.",
              },
              {
                icon: CreditCard, color: "#4ade80",
                title: "Payments that work in your country",
                desc: "Razorpay for India, Stripe internationally, UPI, cards, wallets — your customers pay however they prefer, and it all flows into your reports automatically.",
              },
              {
                icon: Bot, color: "#a78bfa",
                title: "AI that actually helps",
                desc: "Not a gimmick — our AI analyses your actual data and says things like 'Thursday evenings have 40% unused capacity — consider a happy hour promotion on Tables 3-5.'",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} style={{
                ...S.panelGlass,
                padding: 28,
                borderRadius: 20,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${color}18`, border: `1px solid ${color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
                }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ color: "#f7f8ff", fontSize: 17, fontWeight: 700, marginBottom: 10, fontFamily: "'Poppins', sans-serif" }}>
                  {title}
                </h3>
                <p style={{ color: "#8d96b3", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
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
            Your club goes digital<br />in under 5 minutes
          </h2>
          <p style={{ color: "#8d96b3", fontSize: 16, maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Sign up, add your tables, set your pricing — and you're ready to start your first session. No consultants, no training, no IT team required.
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
                  { step: "01", title: "Sign up", desc: "Name, email, done — takes 60 seconds" },
                  { step: "02", title: "Set up your club", desc: "Add tables, pricing, menu & staff" },
                  { step: "03", title: "Start earning", desc: "First session tracked, first booking in" },
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
          <SectionLabel>Questions from club owners</SectionLabel>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
            fontWeight: 800,
            textAlign: "center" as const,
            letterSpacing: "-0.025em",
            marginBottom: 48,
            color: "#f7f8ff",
          }}>
            Got questions? We've heard<br />them all before
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
                The all-in-one platform for snooker, pool, and 8-ball clubs — table sessions, bookings, loyalty, staff, and everything in between.
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

            {/* Column 3 – Resources */}
            <div>
              <div style={{ color: "#f7f8ff", fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>RESOURCES</div>
              {[
                { label: "How it helps your club", href: "#pain-points" },
                { label: "Testimonials", href: "#testimonials" },
                { label: "Branding & customisation", href: "#whitelabel" },
                { label: "Live demo", href: "#demo" },
                { label: "FAQ", href: "#" },
                { label: "Blog", href: "#" },
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
