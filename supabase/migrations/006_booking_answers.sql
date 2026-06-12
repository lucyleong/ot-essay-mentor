CREATE TABLE booking_question_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES student_bookings(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES intake_questions(id),
  answer_text text NOT NULL
);

CREATE INDEX idx_answers_booking ON booking_question_answers(booking_id);

ALTER TABLE booking_question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert answers"
  ON booking_question_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Mentors read answers for their bookings"
  ON booking_question_answers FOR SELECT
  USING (
    booking_id IN (
      SELECT sb.id FROM student_bookings sb
      JOIN appointment_slots s ON sb.slot_id = s.id
      JOIN mentor_profiles m   ON s.mentor_id = m.id
      WHERE m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all answers"
  ON booking_question_answers FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');