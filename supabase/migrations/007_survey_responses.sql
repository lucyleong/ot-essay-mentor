CREATE TABLE survey_responses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid NOT NULL REFERENCES student_bookings(id) ON DELETE CASCADE,
  respondent_type    text NOT NULL CHECK (respondent_type IN ('student','mentor')),
  rating_overall     int CHECK (rating_overall BETWEEN 1 AND 5),
  comments           text,
  additional_answers jsonb,
  submitted_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_booking ON survey_responses(booking_id);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert survey responses"
  ON survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins read all responses"
  ON survey_responses FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Mentors read their survey responses"
  ON survey_responses FOR SELECT
  USING (
    booking_id IN (
      SELECT sb.id FROM student_bookings sb
      JOIN appointment_slots s ON sb.slot_id = s.id
      JOIN mentor_profiles m   ON s.mentor_id = m.id
      WHERE m.auth_user_id = auth.uid()
    )
  );