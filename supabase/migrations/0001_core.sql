-- =====================================================================
-- 0001 공통(core) 스키마 — 하나생명 총무 통합 업무 지원 시스템 (새 통합 DB)
-- 대상: PostgreSQL 15+ / Supabase
-- 권한·RLS 정책은 별도 단계에서 추가합니다 (현재 범위 제외).
-- =====================================================================
create extension if not exists btree_gist;   -- 중복예약 차단(EXCLUDE 제약)에 필요
create extension if not exists pgcrypto;     -- 예약코드 해시

create schema if not exists core;
create schema if not exists ga;
create schema if not exists vehicle;
create schema if not exists meeting;
create schema if not exists seal;

-- 부서 (기존 3개 시스템 공통 목록 · '정보보호지원부'로 통일)
create table core.departments (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);

insert into core.departments (name, sort_order)
select name, ord::smallint
from unnest(array[
  '감사부','준법지원부','소비자보호부','선임계리사지원','ICT전략부','AI전략부','영업기획부',
  '금융기관제휴사업부','GA사업부','하이브리드사업부','상품부','계약심사부','보험금심사팀','손님지원센터',
  '재무기획부','경영지원부','가계여신부','자산운용부','변액보험자산운용부','투자관리팀','계리부',
  '리스크관리부','투자심사부','계약관리부','ESG기획팀','정보보호지원부'
]) with ordinality as t(name, ord);

-- 기존 데이터의 부서명 표기 차이를 통일하기 위한 별칭
create table core.department_aliases (
  alias          text primary key,
  department_id  smallint not null references core.departments(id)
);
insert into core.department_aliases (alias, department_id)
select a, (select id from core.departments where name = '정보보호지원부')
from unnest(array['정보보호지원', '정보보호지원팀']) a;

-- 부서명 정규화: 별칭이면 표준명으로, 없으면 원문 유지
create or replace function core.normalize_department(p_name text)
returns text language sql stable as $$
  select coalesce(
    (select d.name from core.department_aliases a join core.departments d on d.id = a.department_id where a.alias = btrim(p_name)),
    btrim(p_name)
  );
$$;

-- 감사 로그 (추가만 가능)
create table core.audit_logs (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  module_key   text not null check (module_key in ('ga','vehicle','meeting','seal','core')),
  entity       text not null,
  entity_id    text not null,
  action       text not null,
  actor        text,
  before_data  jsonb,
  after_data   jsonb
);
create index audit_logs_entity_idx on core.audit_logs (module_key, entity, entity_id);

create or replace function core.forbid_modify()
returns trigger language plpgsql as $$
begin
  raise exception '% 테이블의 기록은 수정하거나 삭제할 수 없습니다.', tg_table_name using errcode = 'P0001';
end;
$$;

create trigger audit_logs_append_only
  before update or delete on core.audit_logs
  for each row execute function core.forbid_modify();

-- updated_at 자동 갱신
create or replace function core.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 기존 시스템 이관 추적: 원본 시스템 + 원본 PK (멱등 이관용)
comment on schema core is '공통: 부서, 감사 로그, 공통 함수';
