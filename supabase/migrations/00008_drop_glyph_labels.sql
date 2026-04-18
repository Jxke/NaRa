do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'glyphs'
      and column_name = 'labels'
  ) then
    alter table public.glyphs
      drop column labels;
  end if;
end $$;
