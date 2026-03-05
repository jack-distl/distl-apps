-- Migration: Add objective-level actioned status, remove per-task status
-- NOTE: This migration has already been applied to Supabase manually.
-- This file exists for version control only.

-- Add actioned status to objectives
ALTER TABLE okr_objectives
  ADD COLUMN is_actioned BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN not_actioned_reason TEXT DEFAULT '';

-- Remove per-task status from key results (no longer used)
ALTER TABLE okr_key_results
  DROP COLUMN IF EXISTS status;
