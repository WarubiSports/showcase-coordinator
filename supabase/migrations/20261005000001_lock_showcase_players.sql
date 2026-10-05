-- showcase_players holds players' and parents' contact data (often minors).
-- Until now anon + authenticated had full read/write via the public key shipped in the page.
-- After this: the public can only register (insert) for open events; all reads and edits go
-- through server routes with the service role (admin basic auth, or a per-event organizer link).

drop policy if exists "Allow anon full access" on public.showcase_players;
drop policy if exists "Allow authenticated full access" on public.showcase_players;

create policy "Public can register for open events"
  on public.showcase_players
  for insert
  to anon, authenticated
  with check (
    coalesce(payment_status, 'pending') = 'pending'
    and exists (
      select 1 from public.showcase_events e
      where e.id = event_id and e.registration_open
    )
  );

-- The public event page only needs the number of registrations (spots left / full)
create or replace function public.showcase_registration_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.showcase_players where event_id = p_event_id
$$;

revoke all on function public.showcase_registration_count(uuid) from public;
grant execute on function public.showcase_registration_count(uuid) to anon, authenticated;
