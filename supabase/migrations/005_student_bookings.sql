CREATE TABLE student_bookings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id               uuid NOT NULL REFERENCES appointment_slots(id),
  program_session_id    uuid REFERENCES program_sessions(id),
  student_name          text NOT NULL,
  student_email         text NOT NULL
                        CHECK (student_email ~* '^[^\s@]+@gmail\.com$'),
  student_phone         text,
  student_id_number     text,
  major                 text,
  year_in_school        int,
  gender                text,
  race_ethnicity        text,
  first_gen_student     boolean DEFAULT false,
  pell_grant_recipient  boolean DEFAULT false,
  google_calendar_event_id text,
  confirmation_code     text NOT NULL,
  sms_confirm_sent      boolean NOT NULL DEFAULT false,
  sms_confirmed_at      timestamptz,
  sms_cancelled_via     text,
  mentor_status_email_sent boolean NOT NULL DEFAULT false,
  booked_at             timestamptz NOT NULL DEFAULT now(),
  cancelled_at          timestamptz
);

CREATE INDEX idx_bookings_slot          ON student_bookings(slot_id);
CREATE INDEX idx_bookings_email         ON student_bookings(student_email);
CREATE INDEX idx_bookings_session       ON student_bookings(program_session_id);
CREATE INDEX idx_bookings_sms_confirm   ON student_bookings(sms_confirm_sent, cancelled_at);

ALTER TABLE student_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert bookings"
  ON student_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students read own bookings"
  ON student_bookings FOR SELECT
  USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "Mentors read their bookings"
  ON student_bookings FOR SELECT
  USING (
    slot_id IN (
      SELECT id FROM appointment_slots
      WHERE mentor_id IN (
        SELECT id FROM mentor_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins manage all bookings"
  ON student_bookings FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');