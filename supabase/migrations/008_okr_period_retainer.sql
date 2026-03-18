-- Add per-period retainer override to okr_periods
-- NULL means "use the client's monthly_retainer as default"
ALTER TABLE okr_periods ADD COLUMN monthly_retainer integer;
