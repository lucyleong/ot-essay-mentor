CREATE TABLE student_essays (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES student_bookings(id) ON DELETE CASCADE,
  essay_type      text NOT NULL CHECK (essay_type IN ('google_doc','file_upload')),
  google_doc_url  text,
  file_path       text,
  file_name       text,
  file_size_bytes int,
  file_mime_type  text,
  note_to_mentor  text,
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_essays_booking ON student_essays(booking_id);

ALTER TABLE student_essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert essays"
  ON student_essays FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students manage own essays"
  ON student_essays FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM student_bookings
      WHERE student_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Mentors read essays for their bookings"
  ON student_essays FOR SELECT
  USING (
    booking_id IN (
      SELECT sb.id FROM student_bookings sb
      JOIN appointment_slots s ON sb.slot_id = s.id
      JOIN mentor_profiles m   ON s.mentor_id = m.id
      WHERE m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all essays"
  ON student_essays FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');