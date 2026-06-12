CREATE TABLE notifications_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid REFERENCES student_bookings(id) ON DELETE SET NULL,
  notification_type  text NOT NULL,
  channel            text NOT NULL CHECK (channel IN ('email','sms')),
  recipient_email    text,
  recipient_phone    text,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','failed','opted_out')),
  resend_message_id  text,
  sent_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_booking ON notifications_log(booking_id);
CREATE INDEX idx_notifications_type    ON notifications_log(notification_type, sent_at);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all notifications"
  ON notifications_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role insert notifications"
  ON notifications_log FOR INSERT
  WITH CHECK (true);