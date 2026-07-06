-- ═══════════════════════════════════════════════════════════
-- Axial Facilities — Supabase Schema
-- نفّذ هذا الملف كاملاً داخل: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- جدول البلوكات والعمال
create table if not exists blocs (
  num text primary key,
  adr text default '',
  bloc_label text default '',
  gps text default '',
  nom text default '',
  tel text default '',
  repos text default '',
  remplacant text default '',
  remplacant_tel text default '',
  photo_url text,
  updated_at timestamptz default now()
);

-- جدول سجلات الحضور / الغياب / التأخر
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  bloc_num text not null references blocs(num) on delete cascade,
  worker_name text default '',
  type text not null, -- present | absent_notif | absent_no | late | left_early
  note text,
  start_time text,
  actual_time text,
  end_time text,
  saved_at timestamptz default now(),
  unique(date, bloc_num)
);

create index if not exists idx_records_date on records(date);
create index if not exists idx_records_bloc on records(bloc_num);

-- تفعيل RLS (مطلوب من Supabase) مع سياسات مفتوحة لهذا التطبيق الداخلي
alter table blocs enable row level security;
alter table records enable row level security;

drop policy if exists "allow all blocs" on blocs;
create policy "allow all blocs" on blocs for all using (true) with check (true);

drop policy if exists "allow all records" on records;
create policy "allow all records" on records for all using (true) with check (true);

-- Storage: صور العمال
insert into storage.buckets (id, name, public)
values ('worker-photos', 'worker-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects for select using (bucket_id = 'worker-photos');

drop policy if exists "anon upload photos" on storage.objects;
create policy "anon upload photos" on storage.objects for insert with check (bucket_id = 'worker-photos');

drop policy if exists "anon update photos" on storage.objects;
create policy "anon update photos" on storage.objects for update using (bucket_id = 'worker-photos');

drop policy if exists "anon delete photos" on storage.objects;
create policy "anon delete photos" on storage.objects for delete using (bucket_id = 'worker-photos');

-- ملاحظة أمنية: السياسات أعلاه مفتوحة (allow all) لأن التطبيق يستعمل anon key مباشرة من المتصفح
-- بلا نظام تسجيل دخول. هذا مناسب لأداة داخلية لفريق صغير خلف رابط غير معلن.
-- إذا بغيتي حماية أقوى مستقبلاً، زيد Supabase Auth وقيّد السياسات بـ auth.uid().
