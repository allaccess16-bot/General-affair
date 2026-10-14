-- 로컬 PostgreSQL에서 Supabase의 API 역할을 흉내내기 위한 준비 (Supabase에서는 실행하지 마세요)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login password 'local-only' noinherit; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
