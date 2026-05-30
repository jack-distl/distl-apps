-- The Unstoppable Blueprint — initial backend library seed
-- Source of truth: 05-backend-library-seed.md (JSON block).
-- One-time starting content only. Everything here is editable in-app afterwards.
-- Idempotent: safe to re-run (dedupes on slug / title / unique constraint).

-- ── Domains (the five columns) ─────────────────────────────────
insert into bp_domains (slug, name, outcome_line, sort_order)
values
  ('be-findable', 'Be Findable', 'people searching for what you sell find you, not your competitor', 1),
  ('be-there', 'Be There When Intent Is High', 'when someone is ready to buy, you''re in front of them', 2),
  ('be-known', 'Be Known and Trusted', 'you know your differentiators and they show everywhere', 3),
  ('be-worth-choosing', 'Be Worth Choosing', 'you turn the people you''ve earned into enquiries', 4),
  ('be-remembered', 'Be Remembered', 'you stay in front of the people who aren''t ready yet', 5)
on conflict (slug) do nothing;

-- ── Library elements ───────────────────────────────────────────
insert into bp_library_elements (domain_id, title, default_recommend, default_why, default_examples, tags, sort_order)
select d.id, v.title, v.recommend, v.why, v.examples, v.tags, v.sort_order
from (values
  -- Be Findable
  ('be-findable', 'Rank for your most profitable searches', 'SEO retainer, tier one', 'People searching for what you sell should find you, not a competitor. Right now you likely rank for your name but not the searches that actually bring enquiries.', 'Priority keyword targeting, service and content pages, on-page optimisation, internal linking.', array['seo']::text[], 1),
  ('be-findable', 'Own your local map', 'Local SEO and Google Business Profile management', 'Most local buying decisions start with the map. If you''re not in the top three for your area, you''re invisible at the moment people choose.', 'Google Business Profile optimisation, review strategy, local citations, location pages.', array['seo','local']::text[], 2),
  ('be-findable', 'Be visible in AI search', 'Generative Engine Optimisation', 'More people get answers from AI tools before they ever click a link. If your business isn''t referenced, you miss a growing slice of discovery.', 'Content structured for AI answers, entity and schema work, authority signals.', array['seo','ai']::text[], 3),
  ('be-findable', 'Earn the authority that makes you the trusted name', 'Link building and digital PR', 'Google trusts sites that reputable sites point to. Without earned links you''ll struggle to outrank established competitors.', 'Digital PR placements, quality backlinks, niche directories, partnerships.', array['seo','pr']::text[], 4),
  ('be-findable', 'Protect rankings with a clean technical foundation', 'Technical SEO', 'A slow, broken or poorly structured site quietly bleeds rankings no matter how good the content is.', 'Site speed, crawl and index health, structured data, mobile performance.', array['seo','technical']::text[], 5),
  ('be-findable', 'Move your site without losing rankings', 'SEO-managed website migration', 'A migration done wrong can wipe years of ranking equity overnight.', 'Redirect mapping, pre and post-launch audits, indexation monitoring.', array['seo','migration']::text[], 6),
  ('be-findable', 'Recover from a ranking drop or penalty', 'Penalty recovery', 'If traffic has fallen off a cliff, you need to diagnose and fix the cause before anything else works.', 'Manual action review, toxic link audit, recovery plan.', array['seo','recovery']::text[], 7),
  -- Be There When Intent Is High
  ('be-there', 'Capture the buyers searching right now', 'Google Ads search, tier one', 'When someone searches with intent, you want to be there. Search ads put you at the top the moment they''re ready.', 'Search campaigns, keyword and negative management, conversion tracking, ad copy.', array['paid','search']::text[], 1),
  ('be-there', 'Put your products in front of ready buyers', 'Google Shopping management', 'For product businesses, Shopping ads show your item, price and image right at the point of decision.', 'Merchant Centre setup, feed optimisation, Shopping and Performance Max.', array['paid','ecommerce']::text[], 2),
  ('be-there', 'Win back the ones who didn''t convert', 'Remarketing', 'Most people don''t buy on the first visit. Remarketing keeps you in front of the ones who showed interest.', 'Audience setup, display and social remarketing, dynamic ads.', array['paid']::text[], 3),
  ('be-there', 'Reach buyers before they search', 'Paid social (Meta), tier one', 'Not everyone is searching yet. Paid social puts you in front of the right people while they scroll, building demand.', 'Meta campaigns, audience targeting, creative testing, conversion tracking.', array['paid','social']::text[], 4),
  ('be-there', 'Reach decision-makers on LinkedIn', 'LinkedIn Ads', 'For B2B and considered purchases, LinkedIn targets by role, industry and company like nothing else.', 'Sponsored content, lead gen forms, audience targeting.', array['paid','b2b']::text[], 5),
  ('be-there', 'Reach a visual discovery-led audience', 'Pinterest Ads', 'For homewares, design, weddings and lifestyle, Pinterest reaches people actively planning purchases.', 'Pin campaigns, audience targeting, shopping integration.', array['paid','lifestyle']::text[], 6),
  ('be-there', 'Build category awareness at scale', 'Programmatic advertising', 'When you need broad, targeted reach beyond search and social, programmatic places you across the web efficiently.', 'Display, video, audience buys, brand placements.', array['paid','awareness']::text[], 7),
  ('be-there', 'Stay in their ears with audio', 'Spotify advertising', 'Audio reaches people in moments other channels can''t, building familiarity in your market.', 'Audio ads, targeting by audience and location.', array['paid','awareness']::text[], 8),
  -- Be Known and Trusted
  ('be-known', 'Know why you, not them', 'Brand strategy', 'If you can''t say clearly why a customer should choose you, your marketing has nothing solid to stand on.', 'Positioning, differentiators, messaging framework, audience definition.', array['brand']::text[], 1),
  ('be-known', 'Look the tier you want to compete at', 'Brand identity and guidelines, tier one', 'If your identity reads a tier below where you want to sit, it undercuts your pricing and pulls down everything else.', 'Logo system, colour and type, brand guidelines, application templates.', array['brand']::text[], 2),
  ('be-known', 'Have a logo that carries the brand', 'Logo design', 'Your logo is the most repeated asset you own. It needs to work everywhere and signal the right thing.', 'Primary and secondary logos, file formats, usage rules.', array['brand']::text[], 3),
  ('be-known', 'Keep design consistent everywhere', 'Graphic design support', 'Inconsistent design across touchpoints makes even good businesses look smaller and less trustworthy.', 'Templates, collateral, social and print assets, ongoing design.', array['brand','design']::text[], 4),
  ('be-known', 'Sound like you everywhere', 'Tone of voice guide', 'A consistent voice makes you recognisable and trusted across every channel and every writer.', 'Voice principles, do and don''t examples, channel guidance.', array['brand','content']::text[], 5),
  -- Be Worth Choosing
  ('be-worth-choosing', 'An industry-leading website that earns instant credibility', 'Website design and build (WordPress), tier one', 'Your website is where interest becomes an enquiry. If it''s slow, dated or hard to use, you lose people at the last step.', 'Custom design, mobile-first build, clear journeys, fast load.', array['web']::text[], 1),
  ('be-worth-choosing', 'A high-performance custom build', 'React website development', 'For complex or high-traffic needs, a custom build gives you speed, flexibility and a better experience than a template.', 'Custom front end, integrations, performance optimisation.', array['web','advanced']::text[], 2),
  ('be-worth-choosing', 'A site built to turn visits into enquiries', 'UX and conversion optimisation', 'Traffic is wasted if the site doesn''t convert. The journey, proof and calls to action decide whether visits become leads.', 'UX review, conversion paths, proof and testimonials, testing.', array['web','cro']::text[], 3),
  ('be-worth-choosing', 'An ecommerce experience that makes buying easy', 'Ecommerce build (Shopify), optimised', 'Every extra step in checkout costs sales. A well-built store removes friction at every stage.', 'Shopify build, product filtering, streamlined checkout, fast mobile.', array['web','ecommerce']::text[], 4),
  ('be-worth-choosing', 'Reliable hosting and infrastructure', 'Domains and managed hosting', 'Downtime and slow servers cost you trust and rankings. Solid infrastructure is the floor everything stands on.', 'Managed hosting, domains, SSL, backups, uptime monitoring.', array['web']::text[], 5),
  ('be-worth-choosing', 'A custom app where your service needs one', 'App development (web or mobile)', 'Some businesses need a tool, portal or app, not just a site, to deliver their service well.', 'Web apps, mobile apps, customer portals, integrations.', array['web','advanced']::text[], 6),
  -- Be Remembered
  ('be-remembered', 'A consistent organic presence on the right channels', 'Organic social management', 'Your audience decides who to trust partly on whether you show up consistently where they already are.', 'Channel management, weekly content, reels, community management.', array['social']::text[], 1),
  ('be-remembered', 'A social strategy tied to business goals', 'Social strategy', 'Posting without a strategy is busywork. A clear plan ties social to real outcomes.', 'Channel plan, content pillars, posting cadence, measurement.', array['social']::text[], 2),
  ('be-remembered', 'A content engine that feeds every channel', 'Content strategy and marketing', 'One strong content engine feeds search, social and email at once, and earns attention instead of buying all of it.', 'Content strategy, blogs and articles, reels, repurposing.', array['content']::text[], 3),
  ('be-remembered', 'Branded content that builds the brand', 'Branded content', 'Content that carries your brand, not just information, is what makes people remember and prefer you.', 'Brand films, photography, campaign content.', array['content','brand']::text[], 4),
  ('be-remembered', 'Email marketing working your customer list', 'Email marketing and automation', 'Your customer list is the one audience you own. Email keeps you in front of them without paying for every touch.', 'Automation flows, newsletters, segmentation, list growth.', array['email']::text[], 5)
) as v(slug, title, recommend, why, examples, tags, sort_order)
join bp_domains d on d.slug = v.slug
where not exists (
  select 1 from bp_library_elements le where le.title = v.title
);

-- ── Industry templates ─────────────────────────────────────────
insert into bp_industry_templates (slug, name, description)
values
  ('builder', 'Builder / construction', 'Custom home builders, trades and construction businesses.'),
  ('professional-services', 'Law firm / professional services', 'Law firms, accountants, consultants and considered-purchase services.'),
  ('hospitality', 'Hospitality / venue', 'Restaurants, cafes, bars and venues.'),
  ('ecommerce', 'Ecommerce / online retail', 'Online stores and product brands.')
on conflict (slug) do nothing;

-- ── Template elements ──────────────────────────────────────────
insert into bp_template_elements (template_id, library_element_id, sort_order)
select t.id, le.id, v.sort_order
from (values
  ('builder', 'Rank for your most profitable searches', 1),
  ('builder', 'Own your local map', 2),
  ('builder', 'Earn the authority that makes you the trusted name', 3),
  ('builder', 'Capture the buyers searching right now', 4),
  ('builder', 'Reach buyers before they search', 5),
  ('builder', 'Win back the ones who didn''t convert', 6),
  ('builder', 'Know why you, not them', 7),
  ('builder', 'Look the tier you want to compete at', 8),
  ('builder', 'Keep design consistent everywhere', 9),
  ('builder', 'An industry-leading website that earns instant credibility', 10),
  ('builder', 'A site built to turn visits into enquiries', 11),
  ('builder', 'Reliable hosting and infrastructure', 12),
  ('builder', 'A consistent organic presence on the right channels', 13),
  ('builder', 'A content engine that feeds every channel', 14),
  ('builder', 'Email marketing working your customer list', 15),

  ('professional-services', 'Rank for your most profitable searches', 1),
  ('professional-services', 'Own your local map', 2),
  ('professional-services', 'Be visible in AI search', 3),
  ('professional-services', 'Earn the authority that makes you the trusted name', 4),
  ('professional-services', 'Protect rankings with a clean technical foundation', 5),
  ('professional-services', 'Capture the buyers searching right now', 6),
  ('professional-services', 'Reach decision-makers on LinkedIn', 7),
  ('professional-services', 'Know why you, not them', 8),
  ('professional-services', 'Look the tier you want to compete at', 9),
  ('professional-services', 'Sound like you everywhere', 10),
  ('professional-services', 'An industry-leading website that earns instant credibility', 11),
  ('professional-services', 'A site built to turn visits into enquiries', 12),
  ('professional-services', 'A content engine that feeds every channel', 13),
  ('professional-services', 'Email marketing working your customer list', 14),

  ('hospitality', 'Own your local map', 1),
  ('hospitality', 'Rank for your most profitable searches', 2),
  ('hospitality', 'Reach buyers before they search', 3),
  ('hospitality', 'Reach a visual discovery-led audience', 4),
  ('hospitality', 'Know why you, not them', 5),
  ('hospitality', 'Look the tier you want to compete at', 6),
  ('hospitality', 'Keep design consistent everywhere', 7),
  ('hospitality', 'An industry-leading website that earns instant credibility', 8),
  ('hospitality', 'A consistent organic presence on the right channels', 9),
  ('hospitality', 'Branded content that builds the brand', 10),
  ('hospitality', 'Email marketing working your customer list', 11),

  ('ecommerce', 'Rank for your most profitable searches', 1),
  ('ecommerce', 'Be visible in AI search', 2),
  ('ecommerce', 'Protect rankings with a clean technical foundation', 3),
  ('ecommerce', 'Capture the buyers searching right now', 4),
  ('ecommerce', 'Put your products in front of ready buyers', 5),
  ('ecommerce', 'Win back the ones who didn''t convert', 6),
  ('ecommerce', 'Reach buyers before they search', 7),
  ('ecommerce', 'Reach a visual discovery-led audience', 8),
  ('ecommerce', 'Look the tier you want to compete at', 9),
  ('ecommerce', 'An ecommerce experience that makes buying easy', 10),
  ('ecommerce', 'A site built to turn visits into enquiries', 11),
  ('ecommerce', 'Reliable hosting and infrastructure', 12),
  ('ecommerce', 'A consistent organic presence on the right channels', 13),
  ('ecommerce', 'A content engine that feeds every channel', 14),
  ('ecommerce', 'Email marketing working your customer list', 15)
) as v(tslug, etitle, sort_order)
join bp_industry_templates t on t.slug = v.tslug
join bp_library_elements le on le.title = v.etitle
on conflict (template_id, library_element_id) do nothing;
