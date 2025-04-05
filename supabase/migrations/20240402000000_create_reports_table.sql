create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  location jsonb not null,
  category text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.reports enable row level security;

-- Create policies
create policy "Users can view all reports" on public.reports
  for select using (true);

create policy "Users can create their own reports" on public.reports
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own reports" on public.reports
  for update using (auth.uid() = user_id);

create policy "Users can delete their own reports" on public.reports
  for delete using (auth.uid() = user_id); 