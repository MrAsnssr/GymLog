-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    phone_number TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercises table (shared across all users)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'other')),
    muscle_groups TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_sessions table
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_sets table
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    set_number INTEGER NOT NULL,
    weight_lbs DECIMAL(6, 2),
    reps INTEGER,
    duration_seconds INTEGER,
    rest_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_plans table
CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_plan_exercises table
CREATE TABLE workout_plan_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    target_sets INTEGER,
    target_reps INTEGER,
    target_weight_lbs DECIMAL(6, 2),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food_logs table
CREATE TABLE food_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL,
    calories INTEGER,
    protein_g DECIMAL(6, 2),
    carbs_g DECIMAL(6, 2),
    fat_g DECIMAL(6, 2),
    serving_size TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create body_measurements table
CREATE TABLE body_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    measurement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    weight_lbs DECIMAL(6, 2),
    body_fat_percent DECIMAL(5, 2),
    measurements JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_session_date ON workout_sessions(session_date DESC);
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX idx_workout_plan_exercises_plan_id ON workout_plan_exercises(plan_id);
CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_meal_date ON food_logs(meal_date DESC);
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX idx_body_measurements_measurement_date ON body_measurements(measurement_date DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view display names"
    ON profiles FOR SELECT
    USING (true);

-- RLS Policies for exercises (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view exercises"
    ON exercises FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for workout_sessions
CREATE POLICY "Users can view their own workout sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions"
    ON workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for workout_sets
CREATE POLICY "Users can view their own workout sets"
    ON workout_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own workout sets"
    ON workout_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own workout sets"
    ON workout_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own workout sets"
    ON workout_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

-- RLS Policies for workout_plans
CREATE POLICY "Users can view their own workout plans"
    ON workout_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout plans"
    ON workout_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
    ON workout_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
    ON workout_plans FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for workout_plan_exercises
CREATE POLICY "Users can view their own workout plan exercises"
    ON workout_plan_exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_exercises.plan_id
            AND workout_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own workout plan exercises"
    ON workout_plan_exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_exercises.plan_id
            AND workout_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own workout plan exercises"
    ON workout_plan_exercises FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_exercises.plan_id
            AND workout_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own workout plan exercises"
    ON workout_plan_exercises FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_exercises.plan_id
            AND workout_plans.user_id = auth.uid()
        )
    );

-- RLS Policies for food_logs
CREATE POLICY "Users can view their own food logs"
    ON food_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food logs"
    ON food_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food logs"
    ON food_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food logs"
    ON food_logs FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for body_measurements
CREATE POLICY "Users can view their own body measurements"
    ON body_measurements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body measurements"
    ON body_measurements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body measurements"
    ON body_measurements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body measurements"
    ON body_measurements FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_workout_sessions_updated_at
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_workout_plans_updated_at
    BEFORE UPDATE ON workout_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_food_logs_updated_at
    BEFORE UPDATE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


