CREATE TABLE mentor_availability_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id     uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  is_available  boolean NOT NULL,
  toggled_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_availability_log_mentor_time ON mentor_availability_log(mentor_id, toggled_at);

ALTER TABLE mentor_availability_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors insert own availability log"
  ON mentor_availability_log FOR INSERT
  WITH CHECK (
    mentor_id IN (
      SELECT id FROM mentor_profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Mentors read own availability log"
  ON mentor_availability_log FOR SELECT
  USING (
    mentor_id IN (
      SELECT id FROM mentor_profiles WHERE auth_user_id = auth.uid()
    )
  );
