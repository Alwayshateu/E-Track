-- Atomic, owner-scoped annotation replacement protocol. Pending deployment only.
-- Old clients that write the table directly DO NOT participate in this lock/CAS
-- protocol. Do not claim protection against those clients; retire them separately.
-- Validation/permission/rollback scenarios are statically tested, not executed by
-- this change. Before deployment, verify with two authenticated users and two
-- concurrent transactions: non-owner rejection, anon/PUBLIC EXECUTE denial, stale
-- baseline rejection, invalid item rollback, and forced insert-failure rollback.

create or replace function public.replace_practice_annotations(
  p_unit_id uuid,
  p_expected_user_id uuid,
  p_expected_annotations jsonb,
  p_annotations jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_payload jsonb;
  v_item jsonb;
  v_canonical jsonb;
  v_expected jsonb;
  v_next jsonb;
  v_current jsonb;
  v_ids text[];
  v_index integer := 0;
begin
  -- Capture the intended account in the request: a token refresh/account switch
  -- cannot silently redirect somebody else's local marks to the new auth.uid().
  if v_user_id is null or p_expected_user_id is distinct from v_user_id then
    raise exception using errcode = '42501', message = 'annotation account authorization changed';
  end if;
  if p_unit_id is null then
    raise exception using errcode = '22023', message = 'invalid annotation unit';
  end if;

  -- Validate BOTH full arrays before touching any row. IS DISTINCT FROM rejects
  -- SQL NULL as well as JSON null; missing keys are not silently treated as null.
  foreach v_payload in array array[p_expected_annotations, p_annotations] loop
    if jsonb_typeof(v_payload) is distinct from 'array' then
      raise exception using errcode = '22023', message = 'invalid annotation array';
    end if;
    if jsonb_array_length(v_payload) > 1000 then
      raise exception using errcode = '22023', message = 'annotation batch limit exceeded';
    end if;
    v_canonical := '[]'::jsonb;
    v_ids := array[]::text[];
    for v_item in select value from jsonb_array_elements(v_payload) loop
      if jsonb_typeof(v_item) is distinct from 'object' then
        raise exception using errcode = '22023', message = 'invalid annotation object';
      end if;
      if not (v_item ?& array['paragraph_index', 'start_offset', 'end_offset', 'selected_text', 'kind', 'note', 'metadata'])
         or (select count(*) from jsonb_object_keys(v_item)) <> 7 then
        raise exception using errcode = '22023', message = 'invalid annotation fields';
      end if;
      if jsonb_typeof(v_item->'paragraph_index') is distinct from 'number'
         or jsonb_typeof(v_item->'start_offset') is distinct from 'number'
         or jsonb_typeof(v_item->'end_offset') is distinct from 'number'
         or jsonb_typeof(v_item->'selected_text') is distinct from 'string'
         or jsonb_typeof(v_item->'kind') is distinct from 'string'
         or jsonb_typeof(v_item->'note') not in ('string', 'null')
         or jsonb_typeof(v_item->'metadata') is distinct from 'object' then
        raise exception using errcode = '22023', message = 'invalid annotation field types';
      end if;
      if (v_item->>'paragraph_index') !~ '^[0-9]+$'
         or (v_item->>'start_offset') !~ '^[0-9]+$'
         or (v_item->>'end_offset') !~ '^[0-9]+$' then
        raise exception using errcode = '22023', message = 'invalid annotation integer';
      end if;
      if (v_item->>'paragraph_index')::numeric > 2147483647
         or (v_item->>'start_offset')::numeric > 2147483647
         or (v_item->>'end_offset')::numeric > 2147483647
         or (v_item->>'end_offset')::numeric <= (v_item->>'start_offset')::numeric then
        raise exception using errcode = '22023', message = 'invalid annotation offsets';
      end if;
      if length(v_item->>'selected_text') not between 1 and 20000
         or length(coalesce(v_item->>'note', '')) > 20000
         or v_item->>'kind' not in ('highlight', 'note') then
        raise exception using errcode = '22023', message = 'invalid annotation text or kind';
      end if;
      if jsonb_typeof(v_item->'metadata'->'client_annotation_id') is distinct from 'string'
         or (select count(*) from jsonb_object_keys(v_item->'metadata')) <> 1 then
        raise exception using errcode = '22023', message = 'invalid annotation metadata';
      end if;
      if length(v_item->'metadata'->>'client_annotation_id') not between 1 and 1000
         or (v_item->'metadata'->>'client_annotation_id') = any(v_ids) then
        raise exception using errcode = '22023', message = 'invalid or duplicate annotation id';
      end if;
      v_ids := array_append(v_ids, v_item->'metadata'->>'client_annotation_id');
      v_canonical := v_canonical || jsonb_build_array(jsonb_build_object(
        'paragraph_index', (v_item->>'paragraph_index')::integer,
        'start_offset', (v_item->>'start_offset')::integer,
        'end_offset', (v_item->>'end_offset')::integer,
        'selected_text', v_item->>'selected_text',
        'kind', v_item->>'kind',
        'note', nullif(v_item->>'note', ''),
        'metadata', v_item->'metadata'
      ));
    end loop;
    -- Arrays are sets identified by client id. Sort BOTH input arrays on the
    -- server; never compare a JS hash/order to a PostgreSQL hash/order.
    select coalesce(jsonb_agg(value order by value::text collate "C"), '[]'::jsonb)
      into v_canonical from jsonb_array_elements(v_canonical);
    if v_index = 0 then v_expected := v_canonical; else v_next := v_canonical; end if;
    v_index := v_index + 1;
  end loop;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_unit_id::text, 0));
  -- SECURITY INVOKER retains the existing active-unit SELECT and owner RLS.
  if not exists (select 1 from public.practice_units where id = p_unit_id) then
    raise exception using errcode = '42501', message = 'annotation unit unavailable';
  end if;
  select coalesce(jsonb_agg(item order by item::text collate "C"), '[]'::jsonb)
    into v_current
    from (
      select jsonb_build_object(
        'paragraph_index', a.paragraph_index,
        'start_offset', a.start_offset,
        'end_offset', a.end_offset,
        'selected_text', a.selected_text,
        'kind', a.kind,
        'note', nullif(a.note, ''),
        'metadata', jsonb_build_object('client_annotation_id',
          case when jsonb_typeof(a.metadata->'client_annotation_id') = 'string'
               then coalesce(nullif(a.metadata->>'client_annotation_id', ''), a.id::text)
               else a.id::text end)
      ) as item
      from public.practice_annotations a
      where a.user_id = v_user_id and a.unit_id = p_unit_id and a.attempt_id is null
    ) canonical_rows;

  if v_current is distinct from v_expected then
    raise exception using errcode = '40001', message = 'annotation baseline conflict';
  end if;

  delete from public.practice_annotations
    where user_id = v_user_id and unit_id = p_unit_id and attempt_id is null;
  insert into public.practice_annotations (
    user_id, unit_id, attempt_id, paragraph_index, start_offset, end_offset,
    selected_text, kind, note, metadata
  )
  select v_user_id, p_unit_id, null,
    (value->>'paragraph_index')::integer, (value->>'start_offset')::integer,
    (value->>'end_offset')::integer, value->>'selected_text', value->>'kind',
    value->>'note', value->'metadata'
  from jsonb_array_elements(v_next);

  -- Any validation/RLS/constraint/insert exception aborts this entire transaction,
  -- including the delete. No exception handler commits a partially cleared set.
  return jsonb_build_object('annotations', v_next);
end;
$$;

revoke all on function public.replace_practice_annotations(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.replace_practice_annotations(uuid, uuid, jsonb, jsonb) from anon;
grant execute on function public.replace_practice_annotations(uuid, uuid, jsonb, jsonb) to authenticated;
