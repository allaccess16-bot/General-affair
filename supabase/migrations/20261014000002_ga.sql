-- =====================================================================
-- 0002 총무 업무요청 — 기존 Supabase public.requests 구조 유지
-- =====================================================================
create table ga.requests (
  id              uuid primary key default gen_random_uuid(),
  request_date    date not null,
  title           text not null,
  description     text not null,
  requester_name  text not null,
  department      text not null,
  contact         text not null,
  edit_password   text,                       -- 기존 호환 (향후 로그인 전환 시 폐지)
  location        text not null,
  category        text not null check (category in ('시설/비품','문서/행정','좌석/이전','출입증/보안','차량/출장','복리후생','계약/구매')),
  urgency         text not null default '보통' check (urgency in ('보통','긴급','낮음')),
  status          text not null default '접수' check (status in ('접수','검토중','진행중','완료','반려')),
  assignee        text,
  admin_memo      text,
  completed_at    timestamptz,
  legacy_source   text,
  legacy_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (legacy_source, legacy_id)
);
create index ga_requests_created_idx on ga.requests (created_at desc);
create index ga_requests_status_idx on ga.requests (status);

create trigger ga_requests_touch before update on ga.requests
  for each row execute function core.touch_updated_at();
