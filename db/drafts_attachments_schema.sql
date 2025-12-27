-- ============================================
-- Drafts & Attachments Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create drafts table
CREATE TABLE IF NOT EXISTS drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT,
    cc TEXT,
    bcc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Either draft_id OR message_id should be set (not both)
    CONSTRAINT check_parent CHECK (
        (draft_id IS NOT NULL AND message_id IS NULL) OR 
        (draft_id IS NULL AND message_id IS NOT NULL)
    )
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drafts_student_id ON drafts(student_id);
CREATE INDEX IF NOT EXISTS idx_attachments_draft_id ON attachments(draft_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- 4. Create updated_at trigger for drafts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (allow all for now - customize as needed)
CREATE POLICY "Allow all operations on drafts" ON drafts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on attachments" ON attachments
    FOR ALL USING (true) WITH CHECK (true);
