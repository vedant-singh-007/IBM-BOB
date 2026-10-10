-- ============================================================
-- ContentFlow AI – Initial Schema Migration
-- Run this in the Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRAND PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  tone          TEXT,
  guidelines    TEXT,
  target_audience TEXT,
  preferred_vocabulary TEXT[],
  words_to_avoid TEXT[],
  example_posts TEXT[],
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  objective       TEXT NOT NULL,
  product         TEXT,
  target_audience TEXT,
  core_message    TEXT,
  call_to_action  TEXT,
  platforms       TEXT[],
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published')),
  strategy        TEXT,
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status  ON campaigns(status);

-- ============================================================
-- CONTENT ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS content_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL DEFAULT 'Untitled',
  content         TEXT NOT NULL,
  asset_type      TEXT NOT NULL DEFAULT 'post'
                    CHECK (asset_type IN ('post','email','blog_outline','summary','repurposed','custom')),
  platform        TEXT,
  tone            TEXT,
  language        TEXT NOT NULL DEFAULT 'en',
  target_audience TEXT,
  brief           TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','review','approved','scheduled','published')),
  word_count      INT,
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_assets_user_id    ON content_assets(user_id);
CREATE INDEX idx_content_assets_campaign   ON content_assets(campaign_id);
CREATE INDEX idx_content_assets_status     ON content_assets(status);
CREATE INDEX idx_content_assets_scheduled  ON content_assets(scheduled_at);

-- ============================================================
-- CONTENT REVISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS content_revisions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id    UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_revisions_asset_id ON content_revisions(asset_id);

-- ============================================================
-- CRITIC REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS critic_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id    UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  findings    JSONB NOT NULL DEFAULT '[]',
  overall     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_critic_reviews_asset_id ON critic_reviews(asset_id);

-- ============================================================
-- MEDIA ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  width        INT,
  height       INT,
  ai_description TEXT,
  tags         TEXT[],
  alt_text     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX idx_media_assets_tags    ON media_assets USING GIN(tags);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_content_assets_updated_at
  BEFORE UPDATE ON content_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE brand_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE critic_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets      ENABLE ROW LEVEL SECURITY;

-- brand_profiles
CREATE POLICY brand_profiles_select ON brand_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY brand_profiles_insert ON brand_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY brand_profiles_update ON brand_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY brand_profiles_delete ON brand_profiles FOR DELETE USING (auth.uid() = user_id);

-- campaigns
CREATE POLICY campaigns_select ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY campaigns_insert ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY campaigns_update ON campaigns FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY campaigns_delete ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- content_assets
CREATE POLICY content_assets_select ON content_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY content_assets_insert ON content_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY content_assets_update ON content_assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY content_assets_delete ON content_assets FOR DELETE USING (auth.uid() = user_id);

-- content_revisions
CREATE POLICY content_revisions_select ON content_revisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY content_revisions_insert ON content_revisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY content_revisions_delete ON content_revisions FOR DELETE USING (auth.uid() = user_id);

-- critic_reviews
CREATE POLICY critic_reviews_select ON critic_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY critic_reviews_insert ON critic_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY critic_reviews_delete ON critic_reviews FOR DELETE USING (auth.uid() = user_id);

-- media_assets
CREATE POLICY media_assets_select ON media_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY media_assets_insert ON media_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY media_assets_update ON media_assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY media_assets_delete ON media_assets FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET POLICIES (run after creating bucket named 'media')
-- ============================================================
-- NOTE: Create the 'media' bucket as PRIVATE in the Supabase dashboard.
-- Then run the following policies for that bucket:

-- INSERT: user can upload to their own folder
-- CREATE POLICY media_upload ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- SELECT: user can only read their own objects
-- CREATE POLICY media_select ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE: user can delete their own objects
-- CREATE POLICY media_delete ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
