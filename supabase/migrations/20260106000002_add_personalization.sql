-- Add personalization columns to profiles table
-- Phase 4: Personalization Settings

-- Base User Settings
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
ADD COLUMN IF NOT EXISTS ai_language TEXT DEFAULT 'ar' CHECK (ai_language IN ('ar', 'en'));

-- Pro User Settings
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS calorie_goal INTEGER,
ADD COLUMN IF NOT EXISTS protein_goal INTEGER,
ADD COLUMN IF NOT EXISTS carb_goal INTEGER,
ADD COLUMN IF NOT EXISTS fat_goal INTEGER,
ADD COLUMN IF NOT EXISTS custom_instructions TEXT,
ADD COLUMN IF NOT EXISTS weekly_email BOOLEAN DEFAULT false;

-- Index for weekly email (for scheduled jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_email ON profiles(weekly_email) WHERE weekly_email = true;

COMMENT ON COLUMN profiles.weight_unit IS 'User preferred weight unit: lbs or kg';
COMMENT ON COLUMN profiles.ai_language IS 'AI response language: ar (Arabic) or en (English)';
COMMENT ON COLUMN profiles.custom_instructions IS 'Pro: Free-form instructions for the AI';
COMMENT ON COLUMN profiles.weekly_email IS 'Pro: Receive weekly summary email';
