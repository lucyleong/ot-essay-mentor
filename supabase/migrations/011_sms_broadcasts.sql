CREATE TABLE sms_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text NOT NULL,
  audience        jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  recipient_count int,
  delivered_count int,
  failed_count    int,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sms_broadcast_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id    uuid NOT NULL REFERENCES sms_broadcasts(id) ON DELETE CASCADE,
  booking_id      uuid REFERENCES student_bookings(id),
  recipient_phone text NOT NULL,
  recipient_name  text,
  rendered_body   text NOT NULL,
  twilio_sid      text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','delivered','failed','opted_out')),
  sent_at         timestamptz,
  error_message   text
);

ALTER TABLE sms_broadcasts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts"
  ON sms_broadcasts FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins read broadcast messages"
  ON sms_broadcast_messages FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');