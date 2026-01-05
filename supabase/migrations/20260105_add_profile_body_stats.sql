-- Add body stats columns to profiles table for Coach Hazzem personalization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add constraint to ensure valid gender values
ALTER TABLE profiles ADD CONSTRAINT valid_gender CHECK (gender IS NULL OR gender IN ('male', 'female'));
