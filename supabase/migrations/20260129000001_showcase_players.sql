-- Create players table for tracking showcase players and test scores
create table if not exists showcase_players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  position text check (position in ('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST')),
  birth_year integer,
  club text,
  country text,
  email text,
  phone text,
  -- Test scores: 2 tries each
  broad_jump_1 decimal,
  broad_jump_2 decimal,
  sprint_1 decimal,
  sprint_2 decimal,
  high_jump_1 decimal,
  high_jump_2 decimal,
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table showcase_players enable row level security;

-- Allow all operations (no auth required for this app)
create policy "Allow all operations on showcase_players"
  on showcase_players
  for all
  using (true)
  with check (true);
