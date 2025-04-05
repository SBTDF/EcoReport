-- Create the reports bucket if it doesn't exist
insert into storage.buckets (id, name)
values ('reports', 'reports')
on conflict (id) do nothing;

-- Allow public read access to all files in the reports bucket
create policy "Give public access to reports bucket"
on storage.objects for select
using (bucket_id = 'reports');

-- Allow authenticated users to upload files to the reports bucket
create policy "Allow authenticated uploads to reports bucket"
on storage.objects for insert
with check (
  bucket_id = 'reports'
  and auth.role() = 'authenticated'
);

-- Allow users to update their own files
create policy "Allow users to update their own files in reports bucket"
on storage.objects for update
using (
  bucket_id = 'reports'
  and auth.uid() = owner
);

-- Allow users to delete their own files
create policy "Allow users to delete their own files in reports bucket"
on storage.objects for delete
using (
  bucket_id = 'reports'
  and auth.uid() = owner
); 