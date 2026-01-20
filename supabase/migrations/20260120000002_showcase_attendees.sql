-- Create attendees table for tracking staff, alumni, coaches, and scouts
create table if not exists showcase_attendees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  role text not null check (role in ('staff', 'alumni', 'coach', 'scout')),
  phone text,
  notes text,
  availability jsonb default '[]',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table showcase_attendees enable row level security;

-- Allow all operations for now (no auth required for this app)
create policy "Allow all operations on showcase_attendees"
  on showcase_attendees
  for all
  using (true)
  with check (true);
