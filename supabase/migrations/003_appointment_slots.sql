CREATE TABLE appointment_slots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id               uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  program_session_id      uuid REFERENCES program_sessions(id),
  start_time              timestamptz NOT NULL,
  end_time                timestamptz NOT NULL,
  duration_minutes        int NOT NULL DEFAULT 45,
  meeting_type            text NOT NULL DEFAULT 'virtual'
                          CHECK (meeting_type IN ('virtual','in_person','phone')),
  location_or_link        text,
  google_calendar_event_id text,
  google_meet_link        text,
  is_booked               boolean NOT NULL DEFAULT false,
  is_cancelled            boolean NOT NULL DEFAULT false,
  recurrence_rule         text CHECK (recurrence_rule IN ('weekly','biweekly','monthly')),
  recurrence_days         text[],
  recurrence_parent_id    uuid REFERENCES appointment_slots(id),
  recurrence_until        date,
  recurrence_count        int,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slots_start_time       ON appointment_slots(start_time);
CREATE INDEX idx_slots_mentor           ON appointment_slots(mentor_id);
CREATE INDEX idx_slots_booked           ON appointment_slots(is_booked, is_cancelled, start_time);
CREATE INDEX idx_slots_session          ON appointment_slots(program_session_id);

ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read available slots"
  ON appointment_slots FOR SELECT
  USING (true);

CREATE POLICY "Mentors manage own slots"
  ON appointment_slots FOR ALL
  USING (
    mentor_id IN (
      SELECT id FROM mentor_profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all slots"
  ON appointment_slots FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');