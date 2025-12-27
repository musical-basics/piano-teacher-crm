-- ============================================
-- Settings/Persona Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Create a table for global app settings
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- The "Persona" Fields
    instructor_profile TEXT,  -- "High demand piano teacher..."
    writing_style TEXT,       -- "No exclamation marks, occasional typos..."
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default persona
INSERT INTO settings (instructor_profile, writing_style) 
VALUES (
    'I am a piano teacher in high demand. I do not do sales. I get straight to the point.', 
    'Casual, lowercase start of sentences sometimes. No exclamation marks. Occasional typos to look real.'
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app)
CREATE POLICY "Allow all operations on settings" ON settings
    FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
