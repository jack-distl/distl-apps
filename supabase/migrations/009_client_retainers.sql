-- Create client_retainers table for per-service retainer amounts
-- Replaces the single monthly_retainer column on clients

CREATE TABLE IF NOT EXISTS client_retainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('seo', 'google_ads', 'social_media', 'programmatic', 'email', 'branding', 'web')),
  monthly_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, service_type)
);

-- Auto-update updated_at
CREATE TRIGGER client_retainers_updated_at
  BEFORE UPDATE ON client_retainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate existing monthly_retainer data into client_retainers as SEO retainers
INSERT INTO client_retainers (client_id, service_type, monthly_amount)
SELECT id, 'seo', monthly_retainer
FROM clients
WHERE monthly_retainer IS NOT NULL AND monthly_retainer > 0
ON CONFLICT DO NOTHING;

-- Rename period-level column for clarity
ALTER TABLE okr_periods RENAME COLUMN monthly_retainer TO seo_retainer;

-- RLS policies
ALTER TABLE client_retainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client retainers"
  ON client_retainers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage client retainers"
  ON client_retainers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Temporary dev policies for anon access (remove when auth is wired up)
CREATE POLICY "Anon can read client retainers"
  ON client_retainers FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert client retainers"
  ON client_retainers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update client retainers"
  ON client_retainers FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can delete client retainers"
  ON client_retainers FOR DELETE TO anon USING (true);
