CREATE TABLE program_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  notes        text,
  archived_at  timestamptz,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sessions"
  ON program_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated read sessions"
  ON program_sessions FOR SELECT
  USING (auth.role() = 'authenticated');