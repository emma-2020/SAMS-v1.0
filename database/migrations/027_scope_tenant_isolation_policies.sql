-- 027_scope_tenant_isolation_policies.sql
--
-- Fixes a real security gap disguised as a performance-advisor finding
-- ("multiple permissive policies"). On announcements, fee_ledger,
-- player_documents, and player_registrations, a `tenant_isolation` policy
-- with `FOR ALL` (covering SELECT/INSERT/UPDATE/DELETE) sits alongside
-- narrower, role-gated policies for specific commands (e.g.
-- fee_ledger_write/update/delete requiring Admin). Postgres OR's multiple
-- permissive policies together, so the broad ALL policy — which only
-- checks academy_id, no role — silently satisfies the check for every
-- command regardless of role, neutering the narrower policies entirely.
--
-- Investigated the REAL intended model by reading the actual Express
-- route/controller/service code for each resource (not guessing), and
-- confirmed via that investigation:
--   - announcements: SELECT open to any academy role; INSERT is
--     Admin-always + Coach-conditional-on-academy-setting (not expressible
--     from row data alone, left as Admin-only here — this makes the RLS
--     defense-in-depth layer slightly stricter than the app for that one
--     Coach edge case, which is safe, not a hole, since real app traffic
--     never goes through RLS anyway); DELETE is Admin-only, no ownership
--     check; there is no UPDATE route at all, so UPDATE is correctly left
--     with no permissive policy (deny by default).
--   - fee_ledger: SELECT open to any academy role (row-level narrowing to
--     own/child records happens in the JS service layer, not RLS, matching
--     the existing pattern on other tables in this schema); writes
--     (INSERT/UPDATE/DELETE) are Admin-only, already correctly scoped by
--     fee_ledger_write/update/delete once freed from tenant_isolation's
--     interference.
--   - player_documents: SELECT open to any academy role (row-level
--     narrowing to own/child/one-player happens in the JS service layer);
--     INSERT is Admin+Coach (player_documents_write); DELETE is Admin-only
--     (player_documents_delete); there is no UPDATE route, correctly left
--     denied.
--   - player_registrations: DIFFERENT FIX — tenant_isolation is dropped
--     entirely here, not narrowed to SELECT. This table already has
--     player_own_record_read/write/update policies that fully and
--     correctly cover SELECT/INSERT/UPDATE (own record, or Admin/Coach for
--     read). Narrowing tenant_isolation to SELECT would still resurrect
--     the exact bug flagged in an earlier compliance audit this session:
--     any academy member — including a different Player or a Parent —
--     could read every player's medical_conditions, allergies,
--     blood_group, and national ID via the broad academy-only check,
--     making player_own_record_read dead code. This table's narrower
--     policies are the complete, correct model on their own; there is no
--     DELETE route/capability anywhere in the app, correctly left denied.
--
-- All four tables are still queried exclusively through supabaseAdmin
-- (service-role, bypasses RLS) by the real Express backend — this fix
-- only closes the gap for someone taking their own real Supabase session
-- JWT and calling the Supabase REST API directly, bypassing the backend.

DROP POLICY IF EXISTS tenant_isolation ON announcements;
CREATE POLICY tenant_isolation ON announcements
  FOR SELECT USING (academy_id = auth_academy_id());

DROP POLICY IF EXISTS tenant_isolation ON fee_ledger;
CREATE POLICY tenant_isolation ON fee_ledger
  FOR SELECT USING (academy_id = auth_academy_id());

DROP POLICY IF EXISTS tenant_isolation ON player_documents;
CREATE POLICY tenant_isolation ON player_documents
  FOR SELECT USING (academy_id = auth_academy_id());

DROP POLICY IF EXISTS tenant_isolation ON player_registrations;
