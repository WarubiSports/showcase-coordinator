-- Restore intended permissive anon access on showcase_* tables.
-- Live app uses the Supabase anon key; previous policies only granted access to
-- authenticated, so the deployed app received [] for every query. Adds a parallel
-- {anon}:ALL policy alongside the existing {authenticated}:ALL on every showcase_* table.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'showcase_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Allow anon full access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
