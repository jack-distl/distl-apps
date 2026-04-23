-- Add internal_notes column to okr_key_results
-- Internal notes are team-only and never shown in the client view
alter table okr_key_results
  add column if not exists internal_notes text not null default '';
