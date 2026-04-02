// ─────────────────────────────────────────────────────────────────────────────
// Cuetronix — Supabase Database Types
// Mirrors the complete schema defined in supabase/migrations/
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── Enums (kept as string unions for flexibility) ────────────────────────────

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
export type SubscriptionInterval = 'monthly' | 'annual';
export type UserRole = 'admin' | 'manager' | 'staff' | 'customer' | 'super_admin';

export type StationStatus = 'available' | 'occupied' | 'maintenance';
export type StationType = 'snooker' | 'pool' | 'gaming' | 'darts' | 'bowling' | 'other';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type BillStatus = 'completed' | 'voided' | 'complimentary';
export type PaymentMethod = 'cash' | 'card' | 'online' | 'credit' | 'complimentary' | 'split';
export type DiscountType = 'flat' | 'percent' | 'student' | 'loyalty' | 'offer';
export type BillItemType = 'product' | 'session' | 'custom';
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
export type BookingPaymentMode = 'venue' | 'online';
export type BookingPaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'holiday' | 'on_leave';
export type BreakType = 'short' | 'meal' | 'other';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type LeaveType = 'casual' | 'sick' | 'emergency' | 'earned' | 'unpaid';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type PayrollStatus = 'draft' | 'finalized' | 'paid';

export type TournamentStatus = 'upcoming' | 'registration_open' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'knockout' | 'league' | 'round_robin' | 'double_elimination' | 'custom';
export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'walkover' | 'bye';
export type ParticipantStatus = 'registered' | 'confirmed' | 'eliminated' | 'winner' | 'withdrawn';
export type PublicRegistrationStatus = 'pending' | 'confirmed' | 'cancelled';

export type OfferType = 'discount' | 'free_session' | 'cashback' | 'combo' | 'freebie';
export type RewardType = 'discount' | 'free_item' | 'free_session' | 'voucher';
export type ReferralStatus = 'pending' | 'qualified' | 'rewarded';
export type InvestmentTransactionType = 'investment' | 'return' | 'withdrawal' | 'dividend';

export type NotificationType = 'booking' | 'low_stock' | 'payment' | 'system' | 'trial' | 'staff_request' | 'subscription';
export type CashTransactionType = 'deposit' | 'withdrawal' | 'bill_receipt' | 'expense';
export type ExpenseCategory = 'rent' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'supplies' | 'other';
export type GatewayProvider = 'stripe' | 'razorpay' | 'square';
export type ReceiptTemplate = 'default' | 'minimal' | 'detailed';
export type MembershipType = 'regular' | 'premium' | 'vip';

// ─── Row types (what you get back from SELECT) ────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  razorpay_plan_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  max_stations: number | null;
  max_staff: number | null;
  max_customers: number | null;
  features: PlanFeatures;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface PlanFeatures {
  ai_assistant: boolean;
  custom_domain: boolean;
  investors: boolean;
  white_label: boolean;
  api_access: boolean;
  priority_support: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  owner_user_id: string | null;
  plan_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_interval: SubscriptionInterval;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  razorpay_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_active: boolean;
  is_sandbox: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
}

export interface PaymentMethodConfig {
  label: string;
  enabled: boolean;
}

export interface TenantConfig {
  tenant_id: string;
  // Branding
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  font_heading: string;
  font_body: string;
  dark_mode_default: boolean;
  powered_by_visible: boolean;
  // Business Info
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_country: string;
  business_postal_code: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_tax_id: string | null;
  business_website: string | null;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  // Payment Gateway
  gateway_provider: GatewayProvider;
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  razorpay_key_id_test: string | null;
  razorpay_key_secret_test: string | null;
  razorpay_key_id_live: string | null;
  razorpay_key_secret_live: string | null;
  razorpay_mode: 'test' | 'live';
  square_access_token: string | null;
  square_location_id: string | null;
  square_environment: 'sandbox' | 'production';
  // Receipt Settings
  receipt_template: ReceiptTemplate;
  receipt_show_logo: boolean;
  receipt_header_text: string | null;
  receipt_footer_text: string;
  receipt_show_tax_id: boolean;
  receipt_tax_label: string;
  // POS & Session Settings
  session_inactivity_timeout: number;
  student_discount_percent: number;
  loyalty_enabled: boolean;
  loyalty_points_per_unit: number;
  loyalty_redeem_threshold: number;
  loyalty_unit_per_point: number;
  default_session_rate: number;
  enable_split_payment: boolean;
  enable_complimentary: boolean;
  enable_credit_payment: boolean;
  // Booking Settings
  booking_slot_duration_mins: number;
  booking_advance_days: number;
  booking_min_notice_hours: number;
  booking_cancellation_hours: number;
  booking_event_name: string;
  booking_coupons: BookingCoupon[];
  booking_confirmation_msg: string | null;
  // Feature Flags
  feature_tournaments: boolean;
  feature_bookings: boolean;
  feature_customer_portal: boolean;
  feature_ai_assistant: boolean;
  feature_staff_hr: boolean;
  feature_cash_management: boolean;
  feature_expenses: boolean;
  feature_investors: boolean;
  feature_how_to_use: boolean;
  // Payment Methods
  payment_methods: Record<string, PaymentMethodConfig>;
  // Custom Domain
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_cname_target: string;
  // Notification Settings
  notify_new_booking: boolean;
  notify_low_stock: boolean;
  low_stock_threshold: number;
  notify_trial_expiry: boolean;
  notify_staff_requests: boolean;
  // Customer Portal
  customer_portal_welcome_text: string | null;
  customer_portal_show_loyalty: boolean;
  customer_portal_show_booking: boolean;
  customer_portal_show_offers: boolean;
  // Extended
  extended_config: Json;
  updated_at: string;
}

export interface BookingCoupon {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  max_uses: number;
  uses: number;
}

export interface OnboardingProgress {
  tenant_id: string;
  step_club_info: boolean;
  step_stations: boolean;
  step_pos: boolean;
  step_staff: boolean;
  step_payment: boolean;
  wizard_dismissed: boolean;
  completed_at: string | null;
}

export interface SaasInvoice {
  id: string;
  tenant_id: string;
  stripe_invoice_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'voided';
  plan_id: string | null;
  interval: string | null;
  period_start: string | null;
  period_end: string | null;
  invoice_number: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Superadmin {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Station {
  id: string;
  tenant_id: string;
  name: string;
  type: StationType;
  rate_per_hour: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_occupied: boolean;
  display_order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  membership_type: MembershipType;
  loyalty_points: number;
  total_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  notes: string | null;
  referral_code: string | null;
  referred_by_id: string | null;
  tags: string[];
  portal_user_id: string | null;
  is_portal_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  is_active: boolean;
  track_stock: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StockHistory {
  id: string;
  tenant_id: string;
  product_id: string;
  delta: number;
  stock_after: number;
  reason: 'sale' | 'manual_add' | 'manual_remove' | 'void' | 'adjustment';
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  tenant_id: string;
  station_id: string;
  customer_id: string | null;
  staff_id: string | null;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  total_pause_ms: number;
  duration_mins: number | null;
  rate_per_hour: number | null;
  total_amount: number | null;
  notes: string | null;
  status: SessionStatus;
  bill_id: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  tenant_id: string;
  bill_number: string | null;
  customer_id: string | null;
  staff_id: string | null;
  session_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_type: DiscountType | null;
  discount_note: string | null;
  tax_rate: number;
  tax_amount: number;
  tax_label: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_breakdown: Record<string, number>;
  gateway_payment_id: string | null;
  loyalty_points_used: number;
  loyalty_points_earned: number;
  status: BillStatus;
  comp_note: string | null;
  void_note: string | null;
  void_by: string | null;
  voided_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  id: string;
  tenant_id: string;
  bill_id: string;
  product_id: string | null;
  item_type: BillItemType;
  name: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_price: number;
  created_at: string;
}

export interface BillEditAudit {
  id: string;
  tenant_id: string;
  bill_id: string;
  edited_by: string | null;
  changes: Record<string, { old_val: unknown; new_val: unknown }>;
  reason: string | null;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  bill_id: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  station_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_mins: number | null;
  status: BookingStatus;
  payment_mode: BookingPaymentMode;
  payment_status: BookingPaymentStatus;
  amount: number;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  coupon_code: string | null;
  discount_amount: number;
  access_code: string | null;
  notes: string | null;
  cancelled_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlotBlock {
  id: string;
  tenant_id: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  session_key: string;
  expires_at: string;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  date_joined: string | null;
  base_salary: number;
  salary_currency: string;
  bank_account_no: string | null;
  bank_routing_no: string | null;
  bank_name: string | null;
  id_proof_type: string | null;
  id_proof_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendance {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  working_hours: number | null;
  status: AttendanceStatus;
  notes: string | null;
  is_regularized: boolean;
  regularized_by: string | null;
  created_at: string;
}

export interface StaffBreak {
  id: string;
  tenant_id: string;
  user_id: string;
  attendance_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  type: BreakType;
  created_at: string;
}

export interface StaffWorkSchedule {
  id: string;
  tenant_id: string;
  user_id: string;
  day_of_week: number;
  shift_start: string | null;
  shift_end: string | null;
  is_off: boolean;
  created_at: string;
}

export interface StaffLeaveRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  days: number | null;
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffOvertimeRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  hours: number;
  reason: string | null;
  rate_multiplier: number;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffDoubleShiftRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  shift_1_start: string | null;
  shift_1_end: string | null;
  shift_2_start: string | null;
  shift_2_end: string | null;
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffAttendanceRegularization {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffAllowance {
  id: string;
  tenant_id: string;
  user_id: string;
  type: 'transport' | 'meal' | 'medical' | 'performance' | 'housing' | 'other';
  amount: number;
  month: number | null;
  year: number | null;
  note: string | null;
  created_at: string;
}

export interface StaffDeduction {
  id: string;
  tenant_id: string;
  user_id: string;
  type: 'advance' | 'penalty' | 'late' | 'absence' | 'tax' | 'other';
  amount: number;
  month: number | null;
  year: number | null;
  note: string | null;
  created_at: string;
}

export interface StaffPayroll {
  id: string;
  tenant_id: string;
  user_id: string;
  month: number;
  year: number;
  base_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  overtime_amount: number;
  allowances_total: number;
  deductions_total: number;
  gross_salary: number;
  net_salary: number;
  status: PayrollStatus;
  paid_at: string | null;
  payment_mode: string | null;
  payslip_url: string | null;
  notes: string | null;
  generated_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  date: string;
  payment_mode: 'cash' | 'bank' | 'card' | 'online';
  vendor_name: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurrence_type: 'monthly' | 'weekly' | 'yearly' | 'quarterly' | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CashVault {
  id: string;
  tenant_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface CashVaultTransaction {
  id: string;
  tenant_id: string;
  type: CashTransactionType;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: 'bill' | 'expense' | 'deposit' | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CashBankDeposit {
  id: string;
  tenant_id: string;
  amount: number;
  bank_name: string | null;
  account_last4: string | null;
  deposit_date: string;
  reference_no: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  game_type: string;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  entry_fee: number;
  entry_fee_currency: string;
  prize_pool: number;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  additional_prizes: { position: number; prize: string }[];
  discount_coupons: TournamentCoupon[];
  banner_url: string | null;
  gallery_urls: string[];
  rules: string | null;
  venue_details: string | null;
  status: TournamentStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TournamentCoupon {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  max_uses: number;
  uses: number;
}

export interface TournamentRegistration {
  id: string;
  tenant_id: string;
  tournament_id: string;
  customer_id: string | null;
  player_name: string;
  player_phone: string | null;
  player_email: string | null;
  seeding: number | null;
  status: ParticipantStatus;
  final_position: number | null;
  notes: string | null;
  created_at: string;
}

export interface TournamentPublicRegistration {
  id: string;
  tenant_id: string;
  tournament_id: string;
  player_name: string;
  player_phone: string;
  player_email: string | null;
  country: string | null;
  coupon_code: string | null;
  original_fee: number;
  discount_amount: number;
  final_fee: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_mode: 'online' | 'venue';
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  registration_number: string | null;
  status: PublicRegistrationStatus;
  created_at: string;
}

export interface TournamentMatch {
  id: string;
  tenant_id: string;
  tournament_id: string;
  round: number;
  match_number: number | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  station_id: string | null;
  scheduled_at: string | null;
  played_at: string | null;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
}

export interface TournamentWinner {
  id: string;
  tenant_id: string;
  tournament_id: string;
  position: number;
  player_name: string;
  prize_won: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: OfferType;
  value: number | null;
  valid_from: string | null;
  valid_until: string | null;
  min_spend: number;
  usage_limit: number | null;
  usage_count: number;
  image_url: string | null;
  is_active: boolean;
  terms: string | null;
  created_at: string;
}

export interface CustomerOffer {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: OfferType;
  value: number | null;
  valid_from: string | null;
  valid_until: string | null;
  image_url: string | null;
  terms: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomerOfferAssignment {
  id: string;
  tenant_id: string;
  offer_id: string;
  customer_id: string;
  is_used: boolean;
  used_at: string | null;
  bill_id: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: RewardType;
  reward_value: number | null;
  product_id: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  tenant_id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  bill_id: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  tenant_id: string;
  referrer_id: string;
  referred_id: string;
  bonus_points: number;
  status: ReferralStatus;
  created_at: string;
}

export interface InvestmentPartner {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  equity_percent: number;
  total_invested: number;
  currency: string;
  notes: string | null;
  joined_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvestmentTransaction {
  id: string;
  tenant_id: string;
  partner_id: string;
  type: InvestmentTransactionType;
  amount: number;
  currency: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Json;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AiChatMessage {
  id: string;
  tenant_id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number | null;
  created_at: string;
}

export interface LoginLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  selfie_url: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface SandboxSession {
  id: string;
  ip_address: string | null;
  country: string | null;
  user_agent: string | null;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  pages_visited: string[];
  converted: boolean;
  converted_at: string | null;
  converted_tenant_id: string | null;
}

export interface SuperAdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: 'tenant' | 'user' | 'plan' | null;
  target_id: string | null;
  metadata: Json;
  ip_address: string | null;
  is_impersonation: boolean;
  created_at: string;
}

// ─── Insert types (required fields only for new rows) ─────────────────────────

export type StationInsert = Omit<Station, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'total_spend' | 'visit_count' | 'last_visit_at'> & {
  id?: string;
};

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type BillInsert = Omit<Bill, 'id' | 'bill_number' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type SessionInsert = Omit<Session, 'id' | 'created_at'> & {
  id?: string;
};

// ─── Database interface (for the typed Supabase client) ───────────────────────

export interface Database {
  public: {
    Tables: {
      subscription_plans:              { Row: SubscriptionPlan;              Insert: Partial<SubscriptionPlan>;            Update: Partial<SubscriptionPlan>; };
      tenants:                         { Row: Tenant;                        Insert: Partial<Tenant>;                      Update: Partial<Tenant>; };
      tenant_members:                  { Row: TenantMember;                  Insert: Partial<TenantMember>;                Update: Partial<TenantMember>; };
      tenant_config:                   { Row: TenantConfig;                  Insert: Partial<TenantConfig>;                Update: Partial<TenantConfig>; };
      onboarding_progress:             { Row: OnboardingProgress;            Insert: Partial<OnboardingProgress>;          Update: Partial<OnboardingProgress>; };
      saas_invoices:                   { Row: SaasInvoice;                   Insert: Partial<SaasInvoice>;                 Update: Partial<SaasInvoice>; };
      superadmins:                     { Row: Superadmin;                    Insert: Partial<Superadmin>;                  Update: Partial<Superadmin>; };
      super_admin_audit_log:           { Row: SuperAdminAuditLog;            Insert: Partial<SuperAdminAuditLog>;          Update: Partial<SuperAdminAuditLog>; };
      sandbox_sessions:                { Row: SandboxSession;                Insert: Partial<SandboxSession>;              Update: Partial<SandboxSession>; };
      login_logs:                      { Row: LoginLog;                      Insert: Partial<LoginLog>;                    Update: Partial<LoginLog>; };
      stations:                        { Row: Station;                       Insert: StationInsert;                        Update: Partial<Station>; };
      customers:                       { Row: Customer;                      Insert: CustomerInsert;                       Update: Partial<Customer>; };
      categories:                      { Row: Category;                      Insert: Partial<Category>;                    Update: Partial<Category>; };
      products:                        { Row: Product;                       Insert: ProductInsert;                        Update: Partial<Product>; };
      stock_history:                   { Row: StockHistory;                  Insert: Partial<StockHistory>;                Update: Partial<StockHistory>; };
      sessions:                        { Row: Session;                       Insert: SessionInsert;                        Update: Partial<Session>; };
      bills:                           { Row: Bill;                          Insert: BillInsert;                           Update: Partial<Bill>; };
      bill_items:                      { Row: BillItem;                      Insert: Partial<BillItem>;                    Update: Partial<BillItem>; };
      bill_edit_audit:                 { Row: BillEditAudit;                 Insert: Partial<BillEditAudit>;               Update: Partial<BillEditAudit>; };
      loyalty_transactions:            { Row: LoyaltyTransaction;            Insert: Partial<LoyaltyTransaction>;          Update: Partial<LoyaltyTransaction>; };
      bookings:                        { Row: Booking;                       Insert: BookingInsert;                        Update: Partial<Booking>; };
      slot_blocks:                     { Row: SlotBlock;                     Insert: Partial<SlotBlock>;                   Update: Partial<SlotBlock>; };
      staff_profiles:                  { Row: StaffProfile;                  Insert: Partial<StaffProfile>;                Update: Partial<StaffProfile>; };
      staff_attendance:                { Row: StaffAttendance;               Insert: Partial<StaffAttendance>;             Update: Partial<StaffAttendance>; };
      staff_breaks:                    { Row: StaffBreak;                    Insert: Partial<StaffBreak>;                  Update: Partial<StaffBreak>; };
      staff_work_schedules:            { Row: StaffWorkSchedule;             Insert: Partial<StaffWorkSchedule>;           Update: Partial<StaffWorkSchedule>; };
      staff_leave_requests:            { Row: StaffLeaveRequest;             Insert: Partial<StaffLeaveRequest>;           Update: Partial<StaffLeaveRequest>; };
      staff_overtime_requests:         { Row: StaffOvertimeRequest;          Insert: Partial<StaffOvertimeRequest>;        Update: Partial<StaffOvertimeRequest>; };
      staff_double_shift_requests:     { Row: StaffDoubleShiftRequest;       Insert: Partial<StaffDoubleShiftRequest>;     Update: Partial<StaffDoubleShiftRequest>; };
      staff_attendance_regularization: { Row: StaffAttendanceRegularization; Insert: Partial<StaffAttendanceRegularization>; Update: Partial<StaffAttendanceRegularization>; };
      staff_allowances:                { Row: StaffAllowance;                Insert: Partial<StaffAllowance>;              Update: Partial<StaffAllowance>; };
      staff_deductions:                { Row: StaffDeduction;                Insert: Partial<StaffDeduction>;              Update: Partial<StaffDeduction>; };
      staff_payroll:                   { Row: StaffPayroll;                  Insert: Partial<StaffPayroll>;                Update: Partial<StaffPayroll>; };
      expenses:                        { Row: Expense;                       Insert: Partial<Expense>;                     Update: Partial<Expense>; };
      cash_vault:                      { Row: CashVault;                     Insert: Partial<CashVault>;                   Update: Partial<CashVault>; };
      cash_vault_transactions:         { Row: CashVaultTransaction;          Insert: Partial<CashVaultTransaction>;        Update: Partial<CashVaultTransaction>; };
      cash_bank_deposits:              { Row: CashBankDeposit;               Insert: Partial<CashBankDeposit>;             Update: Partial<CashBankDeposit>; };
      tournaments:                     { Row: Tournament;                    Insert: Partial<Tournament>;                  Update: Partial<Tournament>; };
      tournament_registrations:        { Row: TournamentRegistration;        Insert: Partial<TournamentRegistration>;      Update: Partial<TournamentRegistration>; };
      tournament_public_registrations: { Row: TournamentPublicRegistration;  Insert: Partial<TournamentPublicRegistration>; Update: Partial<TournamentPublicRegistration>; };
      tournament_matches:              { Row: TournamentMatch;               Insert: Partial<TournamentMatch>;             Update: Partial<TournamentMatch>; };
      tournament_winners:              { Row: TournamentWinner;              Insert: Partial<TournamentWinner>;            Update: Partial<TournamentWinner>; };
      offers:                          { Row: Offer;                         Insert: Partial<Offer>;                       Update: Partial<Offer>; };
      customer_offers:                 { Row: CustomerOffer;                 Insert: Partial<CustomerOffer>;               Update: Partial<CustomerOffer>; };
      customer_offer_assignments:      { Row: CustomerOfferAssignment;       Insert: Partial<CustomerOfferAssignment>;     Update: Partial<CustomerOfferAssignment>; };
      rewards:                         { Row: Reward;                        Insert: Partial<Reward>;                      Update: Partial<Reward>; };
      reward_redemptions:              { Row: RewardRedemption;              Insert: Partial<RewardRedemption>;            Update: Partial<RewardRedemption>; };
      referrals:                       { Row: Referral;                      Insert: Partial<Referral>;                    Update: Partial<Referral>; };
      investment_partners:             { Row: InvestmentPartner;             Insert: Partial<InvestmentPartner>;           Update: Partial<InvestmentPartner>; };
      investment_transactions:         { Row: InvestmentTransaction;         Insert: Partial<InvestmentTransaction>;       Update: Partial<InvestmentTransaction>; };
      notifications:                   { Row: Notification;                  Insert: Partial<Notification>;                Update: Partial<Notification>; };
      ai_chat_history:                 { Row: AiChatMessage;                 Insert: Partial<AiChatMessage>;               Update: Partial<AiChatMessage>; };
    };
    Views: Record<string, never>;
    Functions: {
      check_station_availability: {
        Args: {
          p_tenant_id: string;
          p_station_id: string;
          p_date: string;
          p_start_time: string;
          p_end_time: string;
          p_exclude_booking_id?: string;
        };
        Returns: boolean;
      };
      get_available_slots: {
        Args: {
          p_tenant_id: string;
          p_station_id: string;
          p_date: string;
          p_slot_mins?: number;
        };
        Returns: { slot_start: string; slot_end: string; is_available: boolean }[];
      };
      cleanup_expired_slot_blocks: {
        Args: Record<string, never>;
        Returns: void;
      };
      generate_monthly_payroll: {
        Args: { p_tenant_id: string; p_month: number; p_year: number };
        Returns: StaffPayroll[];
      };
    };
    Enums: Record<string, never>;
  };
}
