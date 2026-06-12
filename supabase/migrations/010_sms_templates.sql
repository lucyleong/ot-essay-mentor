CREATE TABLE sms_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL UNIQUE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('student','mentor')),
  trigger_event  text NOT NULL,
  body           text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  updated_by     uuid REFERENCES auth.users(id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sms_template_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES sms_templates(id) ON DELETE CASCADE,
  body        text NOT NULL,
  saved_by    uuid REFERENCES auth.users(id),
  saved_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sms_opt_outs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        text NOT NULL UNIQUE,
  opted_out_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SMS templates"
  ON sms_templates FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated read SMS templates"
  ON sms_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages opt-outs"
  ON sms_opt_outs FOR ALL
  USING (true);

INSERT INTO sms_templates (template_key, recipient_type, trigger_event, body) VALUES
('confirm_48h','student','reminder_48h',
'[OT Essay Mentor] Hi {{student_name}}, your appointment with {{mentor_name}} is in 2 days - {{appointment_date}} at {{appointment_time}}.{{#if meet_link}} Join: {{meet_link}}{{/if}} Reply CONFIRM or CANCEL.');