CREATE TABLE mentor_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name             text NOT NULL,
  email                 text NOT NULL UNIQUE,
  phone                 text,
  department            text,
  bio                   text,
  profile_photo_url     text,
  is_active             boolean NOT NULL DEFAULT true,
  sms_opt_in            boolean NOT NULL DEFAULT false,
  google_access_token   text,
  google_refresh_token  text,
  google_token_expiry   timestamptz,
  anonymized_at         timestamptz,
  anonymized_name       text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors read own profile"
  ON mentor_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Mentors update own profile"
  ON mentor_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins manage all profiles"
  ON mentor_profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');