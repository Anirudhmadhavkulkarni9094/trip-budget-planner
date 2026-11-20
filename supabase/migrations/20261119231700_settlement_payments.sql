create table public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  payer text not null,
  payee text not null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  constraint settlement_payments_distinct_people check (payer <> payee),
  constraint settlement_payments_unique_pair unique (trip_id, payer, payee)
);

create index settlement_payments_trip_idx
  on public.settlement_payments (trip_id);

alter table public.settlement_payments enable row level security;

create policy "Owners can read their settlement statuses"
  on public.settlement_payments for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = settlement_payments.trip_id
        and trips.owner_id = (select auth.uid())
        and trips.is_ended
    )
  );

create policy "Owners can create settlement statuses for ended trips"
  on public.settlement_payments for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = settlement_payments.trip_id
        and trips.owner_id = (select auth.uid())
        and trips.is_ended
    )
  );

create policy "Owners can update settlement statuses for ended trips"
  on public.settlement_payments for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = settlement_payments.trip_id
        and trips.owner_id = (select auth.uid())
        and trips.is_ended
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.trips
      where trips.id = settlement_payments.trip_id
        and trips.owner_id = (select auth.uid())
        and trips.is_ended
    )
  );
