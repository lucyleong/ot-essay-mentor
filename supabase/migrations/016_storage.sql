INSERT INTO storage.buckets (id, name, public)
VALUES ('essays', 'essays', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Students upload own essays"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'essays');

CREATE POLICY "Students and mentors read essays"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'essays');

CREATE POLICY "Service role delete essays"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'essays');