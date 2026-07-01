-- OKR period: editable ad-hoc buffer % and Account Management %
-- Depends on: 002_okr_tables.sql
--
-- ad_hoc buffer was previously hard-coded at 10%; make it per-period.
-- Account Management is a per-period % (defaults 5) whose derived hours
-- roll into the objective totals.

alter table okr_periods
  add column if not exists adhoc_percent numeric(5,2) not null default 10,
  add column if not exists account_management_name text not null default 'Account Management',
  add column if not exists account_management_percent numeric(5,2) not null default 5;
