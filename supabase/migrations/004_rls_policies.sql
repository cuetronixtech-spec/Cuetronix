-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/004_rls_policies.sql
-- Row-Level Security: enable + 4 policies on every table
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- Macro-style: one block per table
-- Pattern:
--   SELECT  → tenant_id match
--   INSERT  → tenant_id match
--   UPDATE  → tenant_id match
--   DELETE  → tenant_id match + must be admin/manager
-- ─────────────────────────────────────────────────────────

-- ── STATIONS ─────────────────────────────────────────────
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stations_select" ON stations FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "stations_insert" ON stations FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "stations_update" ON stations FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "stations_delete" ON stations FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── CUSTOMERS ────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customers_delete" ON customers FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── CATEGORIES ───────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── PRODUCTS ─────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON products FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "products_update" ON products FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "products_delete" ON products FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── STOCK HISTORY ────────────────────────────────────────
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_history_select" ON stock_history FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "stock_history_insert" ON stock_history FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "stock_history_update" ON stock_history FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "stock_history_delete" ON stock_history FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── SESSIONS ─────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select" ON sessions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "sessions_insert" ON sessions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "sessions_update" ON sessions FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "sessions_delete" ON sessions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── BILLS ────────────────────────────────────────────────
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills_select" ON bills FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bills_insert" ON bills FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bills_update" ON bills FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "bills_delete" ON bills FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── BILL ITEMS ───────────────────────────────────────────
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_items_select" ON bill_items FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bill_items_insert" ON bill_items FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bill_items_update" ON bill_items FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "bill_items_delete" ON bill_items FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── BILL EDIT AUDIT ──────────────────────────────────────
ALTER TABLE bill_edit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_edit_audit_select" ON bill_edit_audit FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "bill_edit_audit_insert" ON bill_edit_audit FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

-- no UPDATE/DELETE on audit log — immutable


-- ── LOYALTY TRANSACTIONS ─────────────────────────────────
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_transactions_select" ON loyalty_transactions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "loyalty_transactions_insert" ON loyalty_transactions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "loyalty_transactions_update" ON loyalty_transactions FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "loyalty_transactions_delete" ON loyalty_transactions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── BOOKINGS ─────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select" ON bookings FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bookings_insert" ON bookings FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bookings_update" ON bookings FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "bookings_delete" ON bookings FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── SLOT BLOCKS ──────────────────────────────────────────
ALTER TABLE slot_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_blocks_select" ON slot_blocks FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "slot_blocks_insert" ON slot_blocks FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "slot_blocks_delete" ON slot_blocks FOR DELETE
  USING (tenant_id = public.jwt_tenant_id());


-- ── STAFF PROFILES ───────────────────────────────────────
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_profiles_select" ON staff_profiles FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_profiles_insert" ON staff_profiles FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "staff_profiles_update" ON staff_profiles FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND (public.jwt_is_admin() OR user_id = auth.uid()));

CREATE POLICY "staff_profiles_delete" ON staff_profiles FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF ATTENDANCE ─────────────────────────────────────
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_attendance_select" ON staff_attendance FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_attendance_insert" ON staff_attendance FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_attendance_update" ON staff_attendance FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_attendance_delete" ON staff_attendance FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF BREAKS ─────────────────────────────────────────
ALTER TABLE staff_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_breaks_select" ON staff_breaks FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_breaks_insert" ON staff_breaks FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_breaks_update" ON staff_breaks FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_breaks_delete" ON staff_breaks FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── STAFF WORK SCHEDULES ─────────────────────────────────
ALTER TABLE staff_work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_work_schedules_select" ON staff_work_schedules FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_work_schedules_insert" ON staff_work_schedules FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_work_schedules_update" ON staff_work_schedules FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_work_schedules_delete" ON staff_work_schedules FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── STAFF LEAVE REQUESTS ─────────────────────────────────
ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_leave_requests_select" ON staff_leave_requests FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_leave_requests_insert" ON staff_leave_requests FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_leave_requests_update" ON staff_leave_requests FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_leave_requests_delete" ON staff_leave_requests FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF OVERTIME REQUESTS ──────────────────────────────
ALTER TABLE staff_overtime_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_overtime_requests_select" ON staff_overtime_requests FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_overtime_requests_insert" ON staff_overtime_requests FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_overtime_requests_update" ON staff_overtime_requests FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_overtime_requests_delete" ON staff_overtime_requests FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF DOUBLE SHIFT REQUESTS ──────────────────────────
ALTER TABLE staff_double_shift_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_double_shift_select" ON staff_double_shift_requests FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_double_shift_insert" ON staff_double_shift_requests FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_double_shift_update" ON staff_double_shift_requests FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_double_shift_delete" ON staff_double_shift_requests FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF ATTENDANCE REGULARIZATION ─────────────────────
ALTER TABLE staff_attendance_regularization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_reg_select" ON staff_attendance_regularization FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_reg_insert" ON staff_attendance_regularization FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "staff_reg_update" ON staff_attendance_regularization FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_reg_delete" ON staff_attendance_regularization FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF ALLOWANCES ─────────────────────────────────────
ALTER TABLE staff_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_allowances_select" ON staff_allowances FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_allowances_insert" ON staff_allowances FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_allowances_update" ON staff_allowances FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "staff_allowances_delete" ON staff_allowances FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF DEDUCTIONS ─────────────────────────────────────
ALTER TABLE staff_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_deductions_select" ON staff_deductions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_deductions_insert" ON staff_deductions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_deductions_update" ON staff_deductions FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "staff_deductions_delete" ON staff_deductions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── STAFF PAYROLL ────────────────────────────────────────
ALTER TABLE staff_payroll ENABLE ROW LEVEL SECURITY;

-- Admins see all; staff see their own payslip
CREATE POLICY "staff_payroll_select" ON staff_payroll FOR SELECT
  USING (
    tenant_id = public.jwt_tenant_id()
    AND (public.jwt_is_admin_or_manager() OR user_id = auth.uid())
  );

CREATE POLICY "staff_payroll_insert" ON staff_payroll FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_payroll_update" ON staff_payroll FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "staff_payroll_delete" ON staff_payroll FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── EXPENSES ─────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "expenses_delete" ON expenses FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── CASH VAULT ───────────────────────────────────────────
ALTER TABLE cash_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_vault_select" ON cash_vault FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "cash_vault_insert" ON cash_vault FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "cash_vault_update" ON cash_vault FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── CASH VAULT TRANSACTIONS ──────────────────────────────
ALTER TABLE cash_vault_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_vault_tx_select" ON cash_vault_transactions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "cash_vault_tx_insert" ON cash_vault_transactions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "cash_vault_tx_delete" ON cash_vault_transactions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── CASH BANK DEPOSITS ───────────────────────────────────
ALTER TABLE cash_bank_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_bank_deposits_select" ON cash_bank_deposits FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "cash_bank_deposits_insert" ON cash_bank_deposits FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "cash_bank_deposits_delete" ON cash_bank_deposits FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── TOURNAMENTS ──────────────────────────────────────────
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON tournaments FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── TOURNAMENT REGISTRATIONS ─────────────────────────────
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_reg_select" ON tournament_registrations FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_reg_insert" ON tournament_registrations FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_reg_update" ON tournament_registrations FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_reg_delete" ON tournament_registrations FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── TOURNAMENT PUBLIC REGISTRATIONS ──────────────────────
ALTER TABLE tournament_public_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_pub_reg_select" ON tournament_public_registrations FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_pub_reg_insert" ON tournament_public_registrations FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_pub_reg_update" ON tournament_public_registrations FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_pub_reg_delete" ON tournament_public_registrations FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── TOURNAMENT MATCHES ───────────────────────────────────
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_matches_select" ON tournament_matches FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_matches_insert" ON tournament_matches FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_matches_update" ON tournament_matches FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_matches_delete" ON tournament_matches FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── TOURNAMENT WINNERS ───────────────────────────────────
ALTER TABLE tournament_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_winners_select" ON tournament_winners FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tournament_winners_insert" ON tournament_winners FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_winners_update" ON tournament_winners FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "tournament_winners_delete" ON tournament_winners FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── OFFERS ───────────────────────────────────────────────
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_select" ON offers FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "offers_insert" ON offers FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "offers_update" ON offers FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "offers_delete" ON offers FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── CUSTOMER OFFERS ──────────────────────────────────────
ALTER TABLE customer_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_offers_select" ON customer_offers FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customer_offers_insert" ON customer_offers FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "customer_offers_update" ON customer_offers FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "customer_offers_delete" ON customer_offers FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── CUSTOMER OFFER ASSIGNMENTS ───────────────────────────
ALTER TABLE customer_offer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_offer_assign_select" ON customer_offer_assignments FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customer_offer_assign_insert" ON customer_offer_assignments FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "customer_offer_assign_update" ON customer_offer_assignments FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "customer_offer_assign_delete" ON customer_offer_assignments FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── REWARDS ──────────────────────────────────────────────
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select" ON rewards FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "rewards_insert" ON rewards FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "rewards_update" ON rewards FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "rewards_delete" ON rewards FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── REWARD REDEMPTIONS ───────────────────────────────────
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_redemptions_select" ON reward_redemptions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "reward_redemptions_insert" ON reward_redemptions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "reward_redemptions_delete" ON reward_redemptions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── REFERRALS ────────────────────────────────────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select" ON referrals FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "referrals_insert" ON referrals FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "referrals_update" ON referrals FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());

CREATE POLICY "referrals_delete" ON referrals FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── INVESTMENT PARTNERS ──────────────────────────────────
ALTER TABLE investment_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investment_partners_select" ON investment_partners FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_partners_insert" ON investment_partners FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_partners_update" ON investment_partners FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_partners_delete" ON investment_partners FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── INVESTMENT TRANSACTIONS ──────────────────────────────
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investment_tx_select" ON investment_transactions FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_tx_insert" ON investment_transactions FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_tx_update" ON investment_transactions FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "investment_tx_delete" ON investment_transactions FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ── NOTIFICATIONS ────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (
    tenant_id = public.jwt_tenant_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin_or_manager());


-- ── AI CHAT HISTORY ──────────────────────────────────────
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_history_select" ON ai_chat_history FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND user_id = auth.uid());

CREATE POLICY "ai_chat_history_insert" ON ai_chat_history FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND user_id = auth.uid());

CREATE POLICY "ai_chat_history_delete" ON ai_chat_history FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND user_id = auth.uid());


-- ── LOGIN LOGS ───────────────────────────────────────────
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_logs_select" ON login_logs FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "login_logs_insert" ON login_logs FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());

CREATE POLICY "login_logs_delete" ON login_logs FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ─────────────────────────────────────────────────────────
-- TENANT CONFIG — scoped RLS (only admin can write)
-- ─────────────────────────────────────────────────────────
ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_config_select" ON tenant_config FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tenant_config_update" ON tenant_config FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "tenant_config_insert" ON tenant_config FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());


-- ─────────────────────────────────────────────────────────
-- TENANT MEMBERS — users see only their own tenant's members
-- ─────────────────────────────────────────────────────────
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_select" ON tenant_members FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "tenant_members_insert" ON tenant_members FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "tenant_members_update" ON tenant_members FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "tenant_members_delete" ON tenant_members FOR DELETE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ─────────────────────────────────────────────────────────
-- ONBOARDING PROGRESS
-- ─────────────────────────────────────────────────────────
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_progress_select" ON onboarding_progress FOR SELECT
  USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY "onboarding_progress_update" ON onboarding_progress FOR UPDATE
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());

CREATE POLICY "onboarding_progress_insert" ON onboarding_progress FOR INSERT
  WITH CHECK (tenant_id = public.jwt_tenant_id());


-- ─────────────────────────────────────────────────────────
-- SUBSCRIPTION PLANS — public read, no writes from clients
-- ─────────────────────────────────────────────────────────
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_select" ON subscription_plans FOR SELECT
  USING (is_active = TRUE);


-- ─────────────────────────────────────────────────────────
-- TENANTS — each user sees only their tenant row
-- ─────────────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (id = public.jwt_tenant_id() AND is_active = TRUE);

-- No INSERT/UPDATE/DELETE from client — handled server-side only


-- ─────────────────────────────────────────────────────────
-- SAAS INVOICES — admin only
-- ─────────────────────────────────────────────────────────
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_invoices_select" ON saas_invoices FOR SELECT
  USING (tenant_id = public.jwt_tenant_id() AND public.jwt_is_admin());


-- ─────────────────────────────────────────────────────────
-- SANDBOX SESSIONS — platform-level, no RLS needed (server only)
-- ─────────────────────────────────────────────────────────
ALTER TABLE sandbox_sessions ENABLE ROW LEVEL SECURITY;
-- Only service role key can access this table


-- ─────────────────────────────────────────────────────────
-- SUPER ADMIN AUDIT LOG — service role only
-- ─────────────────────────────────────────────────────────
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Only service role key can access this table


-- ─────────────────────────────────────────────────────────
-- SUPERADMINS — service role only
-- ─────────────────────────────────────────────────────────
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;
-- Only service role key can access this table
