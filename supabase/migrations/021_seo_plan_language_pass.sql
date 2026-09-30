-- SEO plan language pass: the task library and objective templates in plain
-- English, the same wording as the WordPress build (2.2.1,
-- Distl_Platform_Seed::rename_statements()).
--
-- Carried to the library and to every copy made from it: plans' objectives
-- and tasks, and each client's future tasks. Each statement only touches a
-- row that still has the exact shipped text, so anything the team has
-- already reworded stays as it is. Safe to run more than once.
-- Depends on: 014_reseed_task_library.sql, 020_okr_future_tasks.sql

-- task_library.name
update task_library set name = 'Secure a placement on a relevant site' where name = 'Find suitable link & purchase';
update task_library set name = 'Secure a placement on a relevant site' where name = 'Find suitable link &amp; purchase';
update task_library set name = 'Share the new link in the report' where name = 'Send link to AM / report';
update task_library set name = 'Check whether AI search work suits the business' where name = 'Check GEO retainer eligibility';
update task_library set name = 'Technical check of the site' where name = 'Technical Audit (priority placeholder, e.g. sitemap changes)';
update task_library set name = 'Quarterly SEO plan report' where name = 'Quarterly OKR Report';
update task_library set name = 'Review results and plan the next period' where name = 'Review Results and Plan Upcoming OKRs';

-- okr_key_results.task
update okr_key_results set task = 'Secure a placement on a relevant site' where task = 'Find suitable link & purchase';
update okr_key_results set task = 'Secure a placement on a relevant site' where task = 'Find suitable link &amp; purchase';
update okr_key_results set task = 'Share the new link in the report' where task = 'Send link to AM / report';
update okr_key_results set task = 'Check whether AI search work suits the business' where task = 'Check GEO retainer eligibility';
update okr_key_results set task = 'Technical check of the site' where task = 'Technical Audit (priority placeholder, e.g. sitemap changes)';
update okr_key_results set task = 'Quarterly SEO plan report' where task = 'Quarterly OKR Report';
update okr_key_results set task = 'Review results and plan the next period' where task = 'Review Results and Plan Upcoming OKRs';

-- okr_future_key_results.task
update okr_future_key_results set task = 'Secure a placement on a relevant site' where task = 'Find suitable link & purchase';
update okr_future_key_results set task = 'Secure a placement on a relevant site' where task = 'Find suitable link &amp; purchase';
update okr_future_key_results set task = 'Share the new link in the report' where task = 'Send link to AM / report';
update okr_future_key_results set task = 'Check whether AI search work suits the business' where task = 'Check GEO retainer eligibility';
update okr_future_key_results set task = 'Technical check of the site' where task = 'Technical Audit (priority placeholder, e.g. sitemap changes)';
update okr_future_key_results set task = 'Quarterly SEO plan report' where task = 'Quarterly OKR Report';
update okr_future_key_results set task = 'Review results and plan the next period' where task = 'Review Results and Plan Upcoming OKRs';

-- objective_templates.title
update objective_templates set title = 'Show your expertise and trustworthiness' where title = 'EEAT Optimisation';
update objective_templates set title = 'Get recommended in AI answers' where title = 'GEO / AI Optimisation';
update objective_templates set title = 'Stop your own pages competing' where title = 'Keyword Cannibalisation / Consolidation';
update objective_templates set title = 'Setting up your SEO' where title = 'SEO Foundations - New Client Onboarding';

-- okr_objectives.title
update okr_objectives set title = 'Show your expertise and trustworthiness' where title = 'EEAT Optimisation';
update okr_objectives set title = 'Get recommended in AI answers' where title = 'GEO / AI Optimisation';
update okr_objectives set title = 'Stop your own pages competing' where title = 'Keyword Cannibalisation / Consolidation';
update okr_objectives set title = 'Setting up your SEO' where title = 'SEO Foundations - New Client Onboarding';

-- okr_future_objectives.title
update okr_future_objectives set title = 'Show your expertise and trustworthiness' where title = 'EEAT Optimisation';
update okr_future_objectives set title = 'Get recommended in AI answers' where title = 'GEO / AI Optimisation';
update okr_future_objectives set title = 'Stop your own pages competing' where title = 'Keyword Cannibalisation / Consolidation';
update okr_future_objectives set title = 'Setting up your SEO' where title = 'SEO Foundations - New Client Onboarding';
