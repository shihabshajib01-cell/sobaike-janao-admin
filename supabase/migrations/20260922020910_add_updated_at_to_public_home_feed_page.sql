-- Preserve bounded Public feed pagination while exposing canonical report freshness
-- metadata required by generated SEO report routes.
--
-- The SEO builder consumes get_public_home_feed_page in 50-row pages. The
-- canonical full-report RPC already exposes updatedAt, but the paginated feed
-- previously exposed only publishedAt, causing edited reports to be rebuilt with
-- stale freshness metadata.

do $migration$
declare
  ddl text;
  before_ddl text;
begin
  select pg_get_functiondef(
    'public.get_public_home_feed_page(double precision,double precision,text,text,integer,integer)'::regprocedure
  )
  into ddl;

  before_ddl := ddl;

  ddl := replace(
    ddl,
    'c.published_at as created_at,' || chr(10) || '      c.has_supporting_info,',
    'c.published_at as created_at,' || chr(10) || '      c.updated_at as updated_at,' || chr(10) || '      c.has_supporting_info,'
  );

  if ddl = before_ddl then
    raise exception 'Expected created_at projection marker was not found';
  end if;

  before_ddl := ddl;

  ddl := replace(
    ddl,
    '''priority'',''medium'',',
    '''updatedAt'', to_char(bc.updated_at at time zone ''UTC'', ''YYYY-MM-DD"T"HH24:MI:SS"Z"''),'
      || chr(10) || '        ''priority'',''medium'','
  );

  if ddl = before_ddl then
    raise exception 'Expected priority JSON marker was not found';
  end if;

  execute ddl;
end
$migration$;
