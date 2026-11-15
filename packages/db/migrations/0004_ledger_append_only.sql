CREATE FUNCTION ledger_entry_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'ledger_entry is append-only: post a correcting entry instead';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ledger_entry_append_only
    BEFORE UPDATE OR DELETE ON ledger_entry
	FOR EACH ROW EXECUTE FUNCTION ledger_entry_append_only();