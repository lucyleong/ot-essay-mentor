CREATE TABLE mentor_student_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id     uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_notes ON mentor_student_notes(mentor_id, student_email);

ALTER TABLE mentor_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage own notes"
  ON mentor_student_notes FOR ALL
  USING (
    mentor_id IN (
      SELECT id FROM mentor_profiles WHERE auth_user_id = auth.uid()
    )
  );