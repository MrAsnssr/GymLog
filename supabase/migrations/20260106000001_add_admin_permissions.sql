-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'asnssrr@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for profiles to allow admins full access
-- First, drop existing policies if they conflict or we want to refine them
DROP POLICY IF EXISTS "Public can view display names" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Policy: Admin can view all profiles, users can view their own
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin() OR auth.uid() = user_id);

-- Policy: Users can only update their own, but Admins can update any
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (is_admin() OR auth.uid() = user_id);

-- Ensure authenticated users can still insert their own (on signup)
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
