-- 00006_glyph_selectability.sql
-- Adds a system-only glyph path so backend can store non-reflective glyphs
-- without allowing them in normal consultation selection.

alter table public.glyphs
  add column if not exists is_selectable boolean not null default true;

insert into public.glyphs (id, tags, interpretations, prompt_questions, is_selectable, bitmap_url)
values (
  'error',
  array['boundary', 'persona', 'misdirected address', 'companion mode'],
  array[
    'This glyph appears when the device is being addressed as though it were a person rather than used for reflection',
    'It marks a boundary condition rather than a symbolic reading',
    'No companion word should be shown with this glyph'
  ],
  array[
    'This is a system-only glyph for personified device talk',
    'Do not use this glyph in normal reflective consultation output'
  ],
  false,
  'glyphs/error.bmp'
)
on conflict (id) do update
set
  tags = excluded.tags,
  interpretations = excluded.interpretations,
  prompt_questions = excluded.prompt_questions,
  is_selectable = excluded.is_selectable,
  bitmap_url = excluded.bitmap_url;

update public.glyphs
set is_selectable = false
where id = 'error';
