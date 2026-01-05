-- Allow authenticated users to insert exercises
CREATE POLICY "Authenticated users can insert exercises"
    ON exercises FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Also allow update (some apps might want this, but let's keep it simple for now)
CREATE POLICY "Authenticated users can update exercises"
    ON exercises FOR UPDATE
    TO authenticated
    USING (true);
