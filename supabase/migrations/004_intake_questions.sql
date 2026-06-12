CREATE TABLE intake_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'textarea'
                CHECK (question_type IN ('text','textarea','select','multiselect')),
  options       jsonb,
  is_required   boolean NOT NULL DEFAULT false,
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE intake_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active questions"
  ON intake_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage questions"
  ON intake_questions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

INSERT INTO intake_questions (question_text, question_type, is_required, sort_order) VALUES
  ('What would you like to discuss in this appointment?', 'textarea', true, 1),
  ('Which essay or personal statement are you working on?', 'text', false, 2),
  ('Have you met with a mentor before?', 'select', false, 3),
  ('Is there anything specific you would like feedback on?', 'textarea', false, 4);

UPDATE intake_questions
SET options = '["Yes", "No", "This is my first time"]'::jsonb
WHERE question_text = 'Have you met with a mentor before?';