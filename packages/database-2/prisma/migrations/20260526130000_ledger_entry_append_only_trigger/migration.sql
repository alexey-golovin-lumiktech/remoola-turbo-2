-- DB-level append-only enforcement on ledger_entry.
--
-- Rationale: application-level discipline (no `ledgerEntryModel.update*`/`delete*`)
-- was restored in this changeset, but the invariant must survive future drift.
-- This trigger blocks UPDATE and DELETE on ledger_entry unless a session-level
-- escape hatch is explicitly set (used by db-fixtures seed and ad-hoc DBA work).
--
-- Escape hatch:
--   SET LOCAL remoola.allow_ledger_mutation = 'true';
-- The setting only persists within the current transaction. Production code paths
-- never set this; seed scripts and emergency DBA sessions opt in explicitly.

CREATE OR REPLACE FUNCTION enforce_ledger_entry_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    bypass_setting text;
BEGIN
    -- current_setting(name, missing_ok) — missing_ok=true returns NULL if unset.
    bypass_setting := current_setting('remoola.allow_ledger_mutation', true);
    IF bypass_setting = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE EXCEPTION 'ledger_entry is append-only: % blocked. Set remoola.allow_ledger_mutation=true to override.', TG_OP
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER ledger_entry_append_only_guard
    BEFORE UPDATE OR DELETE ON "ledger_entry"
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ledger_entry_append_only();
