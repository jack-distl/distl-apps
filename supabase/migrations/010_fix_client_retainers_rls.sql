-- Allow all authenticated users to write to client_retainers
-- Previously only team_members with role = 'admin' could write,
-- causing retainer saves to silently fail for non-admin users.

CREATE POLICY "Authenticated users can manage client retainers"
  ON client_retainers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
