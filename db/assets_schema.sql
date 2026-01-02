-- Assets table for reusable files (images, PDFs, etc.)
-- Run this in Supabase SQL Editor

-- 1. Create the Assets table
create table assets (
  id uuid default uuid_generate_v4() primary key,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamp with time zone default now()
);

-- 2. Enable Row Level Security
alter table assets enable row level security;

-- 3. Allow all access (adjust as needed for your use case)
create policy "Allow all access" on assets for all using (true);
