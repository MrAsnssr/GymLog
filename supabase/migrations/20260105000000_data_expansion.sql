-- Add notes to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create workout_days table
CREATE TABLE IF NOT EXISTS workout_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    satisfaction_level INTEGER CHECK (satisfaction_level >= 1 AND satisfaction_level <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for workout_days
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_days
CREATE POLICY "Users can view their own workout days"
    ON workout_days FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout days"
    ON workout_days FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout days"
    ON workout_days FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout days"
    ON workout_days FOR DELETE
    USING (auth.uid() = user_id);

-- Add columns to workout_sessions
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS day_id UUID REFERENCES workout_days(id) ON DELETE SET NULL;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS satisfaction_level INTEGER CHECK (satisfaction_level >= 1 AND satisfaction_level <= 5);
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS technique TEXT;

-- Add columns to workout_sets
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS satisfaction_level INTEGER CHECK (satisfaction_level >= 1 AND satisfaction_level <= 5);
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS technique TEXT;

-- Add notes to workout_plan_exercises
ALTER TABLE workout_plan_exercises ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes to body_measurements
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for day_id
CREATE INDEX IF NOT EXISTS idx_workout_sessions_day_id ON workout_sessions(day_id);

-- Update updated_at trigger for workout_days
CREATE TRIGGER update_workout_days_updated_at
    BEFORE UPDATE ON workout_days
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Note: We need to add updated_at to workout_days as well for the trigger to work
ALTER TABLE workout_days ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
