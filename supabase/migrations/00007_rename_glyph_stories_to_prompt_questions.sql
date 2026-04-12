do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'glyphs'
      and column_name = 'stories'
  ) then
    alter table public.glyphs
      rename column stories to prompt_questions;
  end if;
end $$;

comment on table public.glyphs is 'The shared NaRa glyph library. Shared across all users, read-only.';
