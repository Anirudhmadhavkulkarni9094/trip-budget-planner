create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travelers text[] not null,
  budget numeric(12, 2) not null check (budget > 0),
  currency text not null,
  travel_style text not null,
  is_ended boolean not null default false,
  created_at timestamptz not null default now(),
  constraint trips_date_range check (end_date >= start_date)
);

create index trips_owner_created_at_idx
  on public.trips (owner_id, created_at desc);

alter table public.trips enable row level security;

create policy "Owners can read their trips"
  on public.trips for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners can create their trips"
  on public.trips for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can update active trips"
  on public.trips for update
  to authenticated
  using (owner_id = (select auth.uid()) and not is_ended)
  with check (owner_id = (select auth.uid()));

create function public.prevent_ended_trip_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_ended then
    raise exception 'Ended trips cannot be changed';
  end if;

  return new;
end;
$$;

create trigger trips_prevent_ended_changes
  before update on public.trips
  for each row
  execute function public.prevent_ended_trip_changes();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  description text not null,
  place text not null default '',
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  paid_by text not null,
  split_type text not null check (split_type in ('equal', 'custom')),
  split_among text[] not null,
  custom_shares jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_shares) = 'object'),
  receipt_name text,
  receipt_path text,
  created_at timestamptz not null default now()
);

create index expenses_trip_date_idx
  on public.expenses (trip_id, date desc);

alter table public.expenses enable row level security;

create policy "Owners can read their expenses"
  on public.expenses for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = expenses.trip_id
        and trips.owner_id = (select auth.uid())
    )
  );

create policy "Owners can add expenses to active trips"
  on public.expenses for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = expenses.trip_id
        and trips.owner_id = (select auth.uid())
        and not trips.is_ended
    )
  );

create policy "Owners can delete expenses from active trips"
  on public.expenses for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = expenses.trip_id
        and trips.owner_id = (select auth.uid())
        and not trips.is_ended
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-receipts', 'trip-receipts', false, 5242880, array['image/*'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/*'];

create policy "Owners can read their trip receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trip-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.trips
      where trips.id::text = (storage.foldername(name))[2]
        and trips.owner_id = (select auth.uid())
    )
  );

create policy "Owners can upload receipts to active trips"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.trips
      where trips.id::text = (storage.foldername(name))[2]
        and trips.owner_id = (select auth.uid())
        and not trips.is_ended
    )
  );

create policy "Owners can delete receipts from active trips"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.trips
      where trips.id::text = (storage.foldername(name))[2]
        and trips.owner_id = (select auth.uid())
        and not trips.is_ended
    )
  );
