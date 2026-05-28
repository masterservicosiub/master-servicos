CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expense_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Public can insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Public can delete expenses" ON public.expenses FOR DELETE USING (true);
