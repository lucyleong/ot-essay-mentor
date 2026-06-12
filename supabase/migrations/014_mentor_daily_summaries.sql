CREATE TABLE mentor_daily_summaries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id    uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, summary_date)
);

CREATE INDEX idx_mentor_daily_summaries_date
  ON mentor_daily_summaries(summary_date);

ALTER TABLE mentor_daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read summaries"
  ON mentor_daily_summaries FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role insert summaries"
  ON mentor_daily_summaries FOR INSERT
  WITH CHECK (true);