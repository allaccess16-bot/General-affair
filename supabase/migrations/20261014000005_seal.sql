-- =====================================================================
-- 0005 인장 날인 신청 및 관리 (신규)
--   인장 2종(법인인감 / 직인), 사전 승인 증빙, 인감증명서·사용인감계 발급 희망,
--   신청번호 자동 발급(SEAL-YYYYMM-0001), 승인과 날인완료 분리, 이력 추가만 가능
-- =====================================================================
create table seal.kinds (
  value       text primary key,
  description text not null,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);
insert into seal.kinds (value, description, sort_order) values
  ('법인인감', '등기소 등록 인감 · 계약서·금융거래 등', 1),
  ('직인', '대표이사 직인 · 공문·증명서 등', 2);

-- 월별 신청번호 카운터 (행 잠금으로 동시 신청 시에도 중복 없음)
create table seal.request_counters (
  yyyymm  char(6) primary key,
  last_no int not null default 0
);

create or replace function seal.next_request_no(p_date date default (now() at time zone 'Asia/Seoul')::date)
returns text language plpgsql as $$
declare k char(6) := to_char(p_date, 'YYYYMM'); n int;
begin
  insert into seal.request_counters (yyyymm, last_no) values (k, 1)
  on conflict (yyyymm) do update set last_no = seal.request_counters.last_no + 1
  returning last_no into n;
  return 'SEAL-' || k || '-' || lpad(n::text, 4, '0');
end;
$$;

create table seal.requests (
  id                      uuid primary key default gen_random_uuid(),
  request_no              text not null unique default seal.next_request_no(),
  requested_at            date not null default (now() at time zone 'Asia/Seoul')::date,
  requester_name          text not null,
  department              text not null,
  contact                 text not null,
  seal_kind               text not null references seal.kinds(value),
  purpose                 text not null,
  document_name           text not null,
  submit_to               text not null,
  needed_date             date not null,
  quantity                smallint not null check (quantity >= 1),
  -- 사전 승인 증빙
  approval_method         text not null check (approval_method in ('전자결재','서면결재','이메일 승인','기타')),
  approval_doc_no         text,
  approver_name           text not null,
  approval_date           date not null,
  approval_note           text,
  constraint seal_approval_evidence check (coalesce(btrim(approval_doc_no), '') <> '' or coalesce(btrim(approval_note), '') <> ''),
  -- 증명서 발급 희망
  need_seal_certificate   boolean not null default false,
  seal_certificate_count  smallint not null default 0 check (seal_certificate_count >= 0),
  need_usage_seal_form    boolean not null default false,
  usage_seal_form_count   smallint not null default 0 check (usage_seal_form_count >= 0),
  remarks                 text,
  -- 처리
  status                  text not null default '접수' check (status in ('접수','검토중','승인','반려','날인완료','취소')),
  handler                 text,
  approved_at             timestamptz,
  reject_reason           text,
  sealed_date             date,
  sealed_by               text,
  certificates_issued     boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint seal_reject_reason check (status <> '반려' or coalesce(btrim(reject_reason), '') <> ''),
  constraint seal_sealed_info check (status <> '날인완료' or (sealed_date is not null and coalesce(btrim(sealed_by), '') <> '' and approved_at is not null))
);
create index seal_requests_kind_status_idx on seal.requests (seal_kind, status);
create index seal_requests_sealed_idx on seal.requests (sealed_date) where status = '날인완료';

create trigger seal_requests_touch before update on seal.requests
  for each row execute function core.touch_updated_at();

-- 첨부파일 (추후 Storage 연동 — 메타데이터만)
create table seal.attachments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references seal.requests(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   text,
  uploaded_at   timestamptz not null default now()
);

-- 승인·처리 이력 (추가만 가능)
create table seal.request_history (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references seal.requests(id),
  at          timestamptz not null default now(),
  action      text not null,
  actor       text not null,
  from_status text,
  to_status   text,
  note        text
);
create trigger seal_history_append_only before update or delete on seal.request_history
  for each row execute function core.forbid_modify();

-- 상태 전이 (승인 ≠ 날인완료)
create or replace function seal.transition(
  p_id uuid, p_action text, p_actor text,
  p_reason text default null, p_sealed_date date default null, p_sealed_by text default null, p_certificates_issued boolean default false
) returns text language plpgsql as $$
declare r seal.requests; v_to text; v_label text; v_note text;
begin
  select * into r from seal.requests where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;

  case p_action
    when 'review'  then if r.status <> '접수' then raise exception 'INVALID_STATE: %', r.status using errcode = 'P0001'; end if;
                        v_to := '검토중'; v_label := '검토 시작';
                        update seal.requests set status = v_to, handler = p_actor where id = p_id;
    when 'approve' then if r.status not in ('접수','검토중') then raise exception 'INVALID_STATE: %', r.status using errcode = 'P0001'; end if;
                        v_to := '승인'; v_label := '승인';
                        update seal.requests set status = v_to, approved_at = now(), handler = coalesce(handler, p_actor) where id = p_id;
    when 'reject'  then if r.status not in ('접수','검토중') then raise exception 'INVALID_STATE: %', r.status using errcode = 'P0001'; end if;
                        v_to := '반려'; v_label := '반려'; v_note := p_reason;
                        update seal.requests set status = v_to, reject_reason = p_reason where id = p_id;
    when 'seal'    then if r.status <> '승인' then raise exception 'NOT_APPROVED: 승인 완료 건만 날인 처리할 수 있습니다.' using errcode = 'P0001'; end if;
                        v_to := '날인완료'; v_label := '날인 완료'; v_note := '날인일 ' || p_sealed_date;
                        update seal.requests set status = v_to, sealed_date = p_sealed_date, sealed_by = p_sealed_by, certificates_issued = p_certificates_issued where id = p_id;
    when 'cancel'  then if r.status not in ('접수','검토중','승인') then raise exception 'INVALID_STATE: %', r.status using errcode = 'P0001'; end if;
                        v_to := '취소'; v_label := '신청 취소';
                        update seal.requests set status = v_to where id = p_id;
    else raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end case;

  insert into seal.request_history (request_id, action, actor, from_status, to_status, note) values (p_id, v_label, p_actor, r.status, v_to, v_note);
  return v_to;
end;
$$;

-- 신청 시 첫 이력 자동 기록
create or replace function seal.on_request_created()
returns trigger language plpgsql as $$
begin
  new.department := core.normalize_department(new.department);
  return new;
end;
$$;
create trigger seal_requests_normalize before insert on seal.requests
  for each row execute function seal.on_request_created();

create or replace function seal.log_created()
returns trigger language plpgsql as $$
begin
  insert into seal.request_history (request_id, action, actor, to_status) values (new.id, '신청 접수', new.requester_name, new.status);
  return null;
end;
$$;
create trigger seal_requests_log_created after insert on seal.requests
  for each row execute function seal.log_created();

-- 출력용 뷰: 날인 요청 목록 / 날인 완료 대장 (인장 종류별 필터)
create view seal.v_request_list as
select request_no, requested_at, needed_date, seal_kind, department, requester_name, document_name, purpose, submit_to, quantity,
       concat_ws(' · ', approval_method, nullif('문서번호 ' || approval_doc_no, '문서번호 '), '승인권자 ' || approver_name, '승인일 ' || approval_date) as approval_evidence,
       concat_ws(', ', case when need_seal_certificate then '법인 인감증명서 ' || seal_certificate_count || '부' end,
                       case when need_usage_seal_form then '사용인감계 ' || usage_seal_form_count || '부' end) as certificates,
       status
from seal.requests where status <> '취소';

create view seal.v_ledger as
select request_no, sealed_date, seal_kind, department, requester_name, document_name, purpose, submit_to, quantity,
       concat_ws(' · ', approval_method, nullif('문서번호 ' || approval_doc_no, '문서번호 '), '승인권자 ' || approver_name) as approval_evidence,
       certificates_issued, sealed_by
from seal.requests where status = '날인완료';
