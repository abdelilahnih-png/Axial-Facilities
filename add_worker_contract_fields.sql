-- ═══════════════════════════════════════════════════════════════
-- إضافة حقول العمال الجداد: رقم البطاقة الوطنية + نوع/مدة العقد
-- نفّذ هاد الكود فـ Supabase → SQL Editor → Run (مرة وحدة كافية)
-- ═══════════════════════════════════════════════════════════════

alter table blocs add column if not exists cin text;
alter table blocs add column if not exists contract_type text;
alter table blocs add column if not exists contract_start date;
alter table blocs add column if not exists contract_end date;

-- (اختياري) فهرس باش البحث عن العقود لي قاربو يسالو يبقى سريع
create index if not exists idx_blocs_contract_end on blocs(contract_end);
