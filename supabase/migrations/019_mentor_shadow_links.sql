CREATE TABLE mentor_shadow_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shadow_mentor_id  uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  lead_mentor_id    uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shadow_mentor_id, lead_mentor_id),
  CHECK (shadow_mentor_id <> lead_mentor_id)
);

CREATE INDEX idx_shadow_links_shadow ON mentor_shadow_links(shadow_mentor_id);
CREATE INDEX idx_shadow_links_lead   ON mentor_shadow_links(lead_mentor_id);

ALTER TABLE mentor_shadow_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shadow links"
  ON mentor_shadow_links FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
