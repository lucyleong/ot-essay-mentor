CREATE TABLE email_templates (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key               text NOT NULL UNIQUE,
  recipient_type             text NOT NULL CHECK (recipient_type IN ('student','mentor')),
  trigger_event              text NOT NULL,
  subject                    text NOT NULL,
  body                       text NOT NULL,
  is_active                  boolean NOT NULL DEFAULT true,
  include_appointment_block  boolean NOT NULL DEFAULT true,
  include_meet_button        boolean NOT NULL DEFAULT true,
  include_student_demo       boolean NOT NULL DEFAULT false,
  include_intake_answers     boolean NOT NULL DEFAULT false,
  include_mentor_bio         boolean NOT NULL DEFAULT false,
  include_cancel_note        boolean NOT NULL DEFAULT true,
  include_dashboard_link     boolean NOT NULL DEFAULT false,
  updated_by                 uuid REFERENCES auth.users(id),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_template_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  body        text NOT NULL,
  saved_by    uuid REFERENCES auth.users(id),
  saved_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION snapshot_email_template()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_template_versions (template_id, subject, body, saved_by)
  VALUES (OLD.id, OLD.subject, OLD.body, OLD.updated_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_template_snapshot
BEFORE UPDATE ON email_templates
FOR EACH ROW EXECUTE FUNCTION snapshot_email_template();

ALTER TABLE email_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates"
  ON email_templates FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated read templates"
  ON email_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins read versions"
  ON email_template_versions FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

INSERT INTO email_templates
  (template_key, recipient_type, trigger_event, subject, body,
   include_intake_answers, include_student_demo, include_dashboard_link, include_meet_button)
VALUES

('booking_student','student','booking_created',
'Your appointment with {{mentor_name}} is confirmed',
$$Hi {{student_name}},

Your appointment with {{mentor_name}} is confirmed.

Date: {{appointment_date}}
Time: {{appointment_time}} - {{appointment_end_time}}
Format: {{meeting_type}}
{{#if meet_link}}Join here: {{meet_link}}{{/if}}
Confirmation code: {{confirmation_code}}

You will receive a reminder text message 2 days before your appointment.
If you need to cancel, contact your coordinator with your confirmation code.$$,
false, false, false, true),

('booking_mentor','mentor','booking_created',
'New booking: {{student_name}} on {{appointment_date}} at {{appointment_time}}',
$$Hi {{mentor_name}},

A student has booked an appointment with you.

Student: {{student_name}}
Email: {{student_email}}
Major: {{student_major}} - Year {{student_year}}
First-generation student: {{first_gen}}

Date: {{appointment_date}}
Time: {{appointment_time}} - {{appointment_end_time}}
Format: {{meeting_type}}
{{#if meet_link}}Google Meet: {{meet_link}}{{/if}}

What they want to discuss:
{{intake_answers}}

View full student profile: {{dashboard_link}}$$,
true, true, true, true),

('essay_submitted','mentor','essay_submitted',
'{{student_name}} shared {{essay_label}} for your {{appointment_date}} appointment',
$$Hi {{mentor_name}},

{{student_name}} has shared {{essay_label}} for your upcoming appointment on {{appointment_date}} at {{appointment_time}}.

{{#if note_to_mentor}}"{{note_to_mentor}}"{{/if}}

View their essay and full profile: {{dashboard_link}}$$,
false, false, true, false),

('mentor_24h_status','mentor','reminder_24h',
'Tomorrow at {{appointment_time}}: {{student_name}} - {{sms_status}}',
$$Hi {{mentor_name}},

Your appointment with {{student_name}} is tomorrow at {{appointment_time}}.

Student status: {{sms_status_detail}}

{{#if meet_link}}Google Meet: {{meet_link}}{{/if}}

{{sms_status_note}}

View full student profile: {{dashboard_link}}$$,
true, true, true, true),

('cancellation_mentor','mentor','booking_cancelled',
'Cancelled: {{student_name}} on {{appointment_date}} at {{appointment_time}}',
$$Hi {{mentor_name}},

{{student_name}} has cancelled their appointment with you via SMS.

The slot on {{appointment_date}} at {{appointment_time}} has been reopened and is available for another student to book.

View your updated schedule: {{dashboard_link}}$$,
true, false, true, false),

('survey_student','student','post_session',
'How did it go? 2-minute survey about your session with {{mentor_name}}',
$$Hi {{student_name}},

Thanks for meeting with {{mentor_name}} on {{appointment_date}}.

Your feedback helps us improve the program - it only takes 2 minutes:
{{survey_link}}

The survey closes in 7 days. Responses are confidential.$$,
false, false, false, false),

('survey_mentor','mentor','post_session',
'Session feedback: your appointment with {{student_name}} on {{appointment_date}}',
$$Hi {{mentor_name}},

Thanks for meeting with {{student_name}} on {{appointment_date}}.

Please share how it went - 2 minutes:
{{survey_link}}

Your insights help us understand what students need most.$$,
false, false, false, false);