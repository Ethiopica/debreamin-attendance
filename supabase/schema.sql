-- Run this once in the Supabase SQL editor before deploying to Vercel.
-- The Next.js server uses the service role key. The public anon key cannot read these tables.

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  teacher_name text not null default '',
  last_date text not null default ''
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.class_groups (
  id text primary key,
  day text not null check (day in ('friday', 'saturday')),
  name text not null,
  sort_order integer not null
);

insert into public.class_groups (id, day, name, sort_order) values
  ('sat-1', 'saturday', 'የቅዳሜ የመጀመሪያ ቡድን', 1),
  ('sat-2', 'saturday', 'የቅዳሜ ሁለተኛ ቡድን', 2),
  ('sat-3', 'saturday', 'የቅዳሜ ሦስተኛ ቡድን', 3),
  ('fri-1', 'friday', 'የአርብ ቡድን', 4)
on conflict (id) do nothing;

create table if not exists public.students (
  id text primary key,
  group_id text not null references public.class_groups (id),
  name text not null,
  created_on text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.attendance_days (
  date text primary key,
  note text not null default ''
);

create table if not exists public.group_records (
  date text not null references public.attendance_days (date) on delete cascade,
  group_id text not null references public.class_groups (id),
  note text not null default '',
  completed boolean not null default false,
  primary key (date, group_id)
);

create table if not exists public.marks (
  date text not null,
  group_id text not null,
  student_id text not null references public.students (id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'permission')),
  primary key (date, group_id, student_id),
  foreign key (date, group_id) references public.group_records (date, group_id) on delete cascade
);

alter table public.app_settings enable row level security;
alter table public.class_groups enable row level security;
alter table public.students enable row level security;
alter table public.attendance_days enable row level security;
alter table public.group_records enable row level security;
alter table public.marks enable row level security;

create or replace function public.load_attendance()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'teacherName', coalesce((select teacher_name from app_settings where id = 1), ''),
    'lastDate', coalesce((select last_date from app_settings where id = 1), ''),
    'groups', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'day', day, 'name', name)
        order by sort_order
      )
      from class_groups
    ), '[]'::jsonb),
    'students', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'groupId', group_id,
          'name', name,
          'createdOn', created_on
        )
        order by sort_order, name
      )
      from students
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_object_agg(
        d.date,
        jsonb_build_object(
          'note', d.note,
          'groups', coalesce((
            select jsonb_object_agg(
              gr.group_id,
              jsonb_build_object(
                'note', gr.note,
                'completed', gr.completed,
                'marks', coalesce((
                  select jsonb_object_agg(m.student_id, to_jsonb(m.status))
                  from marks m
                  where m.date = gr.date and m.group_id = gr.group_id
                ), '{}'::jsonb)
              )
            )
            from group_records gr
            where gr.date = d.date
          ), '{}'::jsonb)
        )
      )
      from attendance_days d
    ), '{}'::jsonb)
  );
$$;

create or replace function public.save_attendance(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update app_settings
  set
    teacher_name = left(coalesce(payload->>'teacherName', ''), 80),
    last_date = coalesce(payload->>'lastDate', '')
  where id = 1;

  update class_groups as g
  set name = left(coalesce(nullif(incoming.name, ''), g.name), 80)
  from (
    select item->>'id' as id, item->>'name' as name
    from jsonb_array_elements(coalesce(payload->'groups', '[]'::jsonb)) item
  ) as incoming
  where g.id = incoming.id;

  insert into students (id, group_id, name, created_on, sort_order)
  select
    item->>'id',
    item->>'groupId',
    left(item->>'name', 80),
    coalesce(item->>'createdOn', ''),
    (ordinality - 1)::integer
  from jsonb_array_elements(coalesce(payload->'students', '[]'::jsonb)) with ordinality as t(item, ordinality)
  where coalesce(item->>'id', '') <> ''
    and coalesce(item->>'name', '') <> ''
    and item->>'groupId' in ('sat-1', 'sat-2', 'sat-3', 'fri-1')
  on conflict (id) do update
  set
    group_id = excluded.group_id,
    name = excluded.name,
    created_on = excluded.created_on,
    sort_order = excluded.sort_order;

  insert into attendance_days (date, note)
  select day.key, left(coalesce(day.value->>'note', ''), 500)
  from jsonb_each(coalesce(payload->'records', '{}'::jsonb)) as day(key, value)
  where day.key ~ '^\d{4}-\d{2}-\d{2}$'
  on conflict (date) do update
  set note = excluded.note;

  insert into group_records (date, group_id, note, completed)
  select
    day.key,
    grp.key,
    left(coalesce(grp.value->>'note', ''), 500),
    coalesce((grp.value->>'completed')::boolean, false)
  from jsonb_each(coalesce(payload->'records', '{}'::jsonb)) as day(key, value)
  cross join lateral jsonb_each(coalesce(day.value->'groups', '{}'::jsonb)) as grp(key, value)
  where day.key ~ '^\d{4}-\d{2}-\d{2}$'
    and grp.key in ('sat-1', 'sat-2', 'sat-3', 'fri-1')
  on conflict (date, group_id) do update
  set
    note = excluded.note,
    completed = excluded.completed;

  insert into marks (date, group_id, student_id, status)
  select
    day.key,
    grp.key,
    mark.key,
    mark.value #>> '{}'
  from jsonb_each(coalesce(payload->'records', '{}'::jsonb)) as day(key, value)
  cross join lateral jsonb_each(coalesce(day.value->'groups', '{}'::jsonb)) as grp(key, value)
  cross join lateral jsonb_each(coalesce(grp.value->'marks', '{}'::jsonb)) as mark(key, value)
  where day.key ~ '^\d{4}-\d{2}-\d{2}$'
    and grp.key in ('sat-1', 'sat-2', 'sat-3', 'fri-1')
    and mark.value #>> '{}' in ('present', 'absent', 'permission')
    and exists (select 1 from students s where s.id = mark.key)
  on conflict (date, group_id, student_id) do update
  set status = excluded.status;

  delete from marks as m
  where not exists (
    select 1
    from jsonb_each(coalesce(payload->'records', '{}'::jsonb)) as day(key, value)
    cross join lateral jsonb_each(coalesce(day.value->'groups', '{}'::jsonb)) as grp(key, value)
    cross join lateral jsonb_each(coalesce(grp.value->'marks', '{}'::jsonb)) as mark(key, value)
    where day.key = m.date
      and grp.key = m.group_id
      and mark.key = m.student_id
      and mark.value #>> '{}' in ('present', 'absent', 'permission')
  );

  delete from group_records as gr
  where not exists (
    select 1
    from jsonb_each(coalesce(payload->'records', '{}'::jsonb)) as day(key, value)
    cross join lateral jsonb_each(coalesce(day.value->'groups', '{}'::jsonb)) as grp(key, value)
    where day.key = gr.date
      and grp.key = gr.group_id
  );

  delete from attendance_days as d
  where not exists (
    select 1
    from jsonb_object_keys(coalesce(payload->'records', '{}'::jsonb)) as kept(day_key)
    where kept.day_key = d.date
  );

  delete from students as s
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'students', '[]'::jsonb)) as item
    where item->>'id' = s.id
  );
end;
$$;

revoke all on function public.load_attendance() from public, anon, authenticated;
revoke all on function public.save_attendance(jsonb) from public, anon, authenticated;
grant execute on function public.load_attendance() to service_role;
grant execute on function public.save_attendance(jsonb) to service_role;

-- Login accounts. The payload holds password hashes and session tokens, never the public anon key.
create table if not exists public.app_auth (
  id text primary key,
  payload jsonb not null
);

insert into public.app_auth (id, payload)
values ('default', '{"users":[],"sessions":[]}'::jsonb)
on conflict (id) do nothing;

alter table public.app_auth enable row level security;

create or replace function public.load_auth()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select payload from public.app_auth where id = 'default'),
    '{"users":[],"sessions":[]}'::jsonb
  );
$$;

create or replace function public.save_auth(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_auth (id, payload)
  values ('default', payload)
  on conflict (id) do update set payload = excluded.payload;
end;
$$;

revoke all on function public.load_auth() from public, anon, authenticated;
revoke all on function public.save_auth(jsonb) from public, anon, authenticated;
grant execute on function public.load_auth() to service_role;
grant execute on function public.save_auth(jsonb) to service_role;
