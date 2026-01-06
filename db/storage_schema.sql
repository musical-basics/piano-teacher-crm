-- Create the 'attachments' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Set up security policies for the 'attachments' bucket
-- 1. Allow public access to view files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'attachments' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'attachments' );

-- 3. Allow authenticated users to delete files
create policy "Authenticated Delete"
on storage.objects for delete
using ( bucket_id = 'attachments' );
