-- Indeko Studio: page templates and template assignments, in line with
-- Katja's SEO Foundations (Indeko) Figma, Composite Sitemap (18 Nov 2026).
--
-- Run once in the Supabase SQL editor. It only touches Indeko's sitemap:
--   1. Templates T1 to T7 get the Figma names and sections. An existing
--      template with the same code is updated in place (pages keep pointing
--      at it); a missing one is created. Other templates are left alone and
--      moved after T7.
--   2. Pages whose URL is in the Figma sitemap point at the Figma template.
--      Pages not listed keep their current template.
-- Everything runs in one transaction, and it stops if it can't find exactly
-- one Indeko sitemap.

begin;

do $$
declare
  sm uuid;
  n int;
begin
  select count(*) into n from sitemaps s join clients c on c.id = s.client_id where c.name ilike 'indeko%';
  if n <> 1 then raise exception 'Expected one Indeko sitemap, found %', n; end if;
  select s.id into sm from sitemaps s join clients c on c.id = s.client_id where c.name ilike 'indeko%';

  -- Make room: templates outside T1 to T7 go after them, in their current order
  update sitemap_page_templates t set sort_order = 6 + o.rn
  from (select id, row_number() over (order by sort_order, id) rn from sitemap_page_templates
        where sitemap_id = sm and upper(code) not in ('T1','T2','T3','T4','T5','T6','T7')) o
  where t.id = o.id;

  -- T1 Home
  update sitemap_page_templates set name = 'Home', description = 'Full-width entry point. Hero video, collection overview, brands, the Indeko Experience, recent installations, the people, the Journal and showrooms.', blocks = '[{"id": "1e1d4520", "title": "Nav bar", "details": "Mega menu"}, {"id": "4c61f799", "title": "Hero Banner", "details": "Hero video with heading and subheading. CTA → ‘Book a Design Consultation’ & ‘Visit a showroom’"}, {"id": "60febcc4", "title": "Collection Overview", "details": "- Curtains\n- Blinds and Shutters\n- Outdoors\n- Wall Coverings\n- Soft Furnishings &\n- Automation\nEach card includes hero image"}, {"id": "f88059f6", "title": "Our Brands", "details": "- Brand names & images\nCTA → ‘Our Brands’"}, {"id": "9c2e0e7d", "title": "Indeko Experience", "details": "- 01 Consult\n- 02 Design\n- 03 Craft\n- 04 Install\nCards with hero images and descriptions. CTA → ‘Begin your consultation’"}, {"id": "eb4e7c07", "title": "Recent Installations", "details": "Image slider and click through to full project overview\nCTA → View all projects"}, {"id": "5c4f755e", "title": "Meet the people behind Indeko", "details": "- Paragraph of copy\n- Team photo\n- Cta → ‘About Us’ & ‘Meet the team’"}, {"id": "69b99c23", "title": "The Journal - Inspiration, Fabrics & Trends and Projects", "details": "Ideas and inspiration\n- 3 x column, image, text and link through to story\nCTA → ‘Read the journal’"}, {"id": "d7908de1", "title": "Our Showrooms", "details": "Spend and hour with Roxanne\n- Image\n- Showroom locations\nCTA → ‘Book a showroom consultation’ & ‘Directions’"}, {"id": "5e9cc1d8", "title": "Footer", "details": ""}]'::jsonb, sort_order = 0
  where sitemap_id = sm and upper(code) = 'T1';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T1', 'Home', 'Full-width entry point. Hero video, collection overview, brands, the Indeko Experience, recent installations, the people, the Journal and showrooms.', '[{"id": "1e1d4520", "title": "Nav bar", "details": "Mega menu"}, {"id": "4c61f799", "title": "Hero Banner", "details": "Hero video with heading and subheading. CTA → ‘Book a Design Consultation’ & ‘Visit a showroom’"}, {"id": "60febcc4", "title": "Collection Overview", "details": "- Curtains\n- Blinds and Shutters\n- Outdoors\n- Wall Coverings\n- Soft Furnishings &\n- Automation\nEach card includes hero image"}, {"id": "f88059f6", "title": "Our Brands", "details": "- Brand names & images\nCTA → ‘Our Brands’"}, {"id": "9c2e0e7d", "title": "Indeko Experience", "details": "- 01 Consult\n- 02 Design\n- 03 Craft\n- 04 Install\nCards with hero images and descriptions. CTA → ‘Begin your consultation’"}, {"id": "eb4e7c07", "title": "Recent Installations", "details": "Image slider and click through to full project overview\nCTA → View all projects"}, {"id": "5c4f755e", "title": "Meet the people behind Indeko", "details": "- Paragraph of copy\n- Team photo\n- Cta → ‘About Us’ & ‘Meet the team’"}, {"id": "69b99c23", "title": "The Journal - Inspiration, Fabrics & Trends and Projects", "details": "Ideas and inspiration\n- 3 x column, image, text and link through to story\nCTA → ‘Read the journal’"}, {"id": "d7908de1", "title": "Our Showrooms", "details": "Spend and hour with Roxanne\n- Image\n- Showroom locations\nCTA → ‘Book a showroom consultation’ & ‘Directions’"}, {"id": "5e9cc1d8", "title": "Footer", "details": ""}]'::jsonb, 0);
  end if;

  -- T2 Service Parent
  update sitemap_page_templates set name = 'Service Parent', description = 'Category hub, e.g. Curtains. Explore the range, choose with confidence, process, fabrics, automation upsell, FAQ and recent homes.', blocks = '[{"id": "a4aa8ed6", "title": "Nav bar", "details": ""}, {"id": "027b2f9e", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’ & ‘Explore the range’"}, {"id": "d79a9082", "title": "Breadcrumbs", "details": ""}, {"id": "27c2febc", "title": "Explore Curtains", "details": "Hero images & link through to categories;\n- Sheer Curtains\n- Blockout Curtains\n- Curtain Styles and Headings\n- Motorised Curtains\n- Tracks and Accessories\n- Theatre Room Curtains\n- Fabrics\nNot sure? Spend an hour with us in the showroom. CTA → ‘Book a Design Consultation’"}, {"id": "f4de7342", "title": "Choosing with confidence", "details": "- Living CTA → ‘Sheers with light-filtering layers’\n- Bedroom CTA → ‘Blockout with a sheer layer’\n- Media room CTA → ‘Theatre Room Curtains’"}, {"id": "551fb08d", "title": "Process", "details": "- Consult\n- Measure\n- Select fabric\n- Handcrafted\n- Installed and styled"}, {"id": "ccaeae91", "title": "Fabrics", "details": "- Image & text\n- The finest fabrics and finishes\n- CTA → ‘Explore fabrics’"}, {"id": "34ec1152", "title": "Automation upsell", "details": "Contextual band for motorisation (an upsell, per the services list)."}, {"id": "bf0d0a34", "title": "FAQ", "details": "Product-level accordion for long-tail SEO."}, {"id": "eea218d4", "title": "Curtains in recent homes", "details": "Project slider with images and click through to individual projects"}, {"id": "d6ccab06", "title": "CTA Section", "details": "- Let''s design your curtains together\n- CTA → ‘Book a Design Consultation’ & ‘Onsite visit’"}, {"id": "fb19a672", "title": "Footer", "details": ""}]'::jsonb, sort_order = 1
  where sitemap_id = sm and upper(code) = 'T2';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T2', 'Service Parent', 'Category hub, e.g. Curtains. Explore the range, choose with confidence, process, fabrics, automation upsell, FAQ and recent homes.', '[{"id": "a4aa8ed6", "title": "Nav bar", "details": ""}, {"id": "027b2f9e", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’ & ‘Explore the range’"}, {"id": "d79a9082", "title": "Breadcrumbs", "details": ""}, {"id": "27c2febc", "title": "Explore Curtains", "details": "Hero images & link through to categories;\n- Sheer Curtains\n- Blockout Curtains\n- Curtain Styles and Headings\n- Motorised Curtains\n- Tracks and Accessories\n- Theatre Room Curtains\n- Fabrics\nNot sure? Spend an hour with us in the showroom. CTA → ‘Book a Design Consultation’"}, {"id": "f4de7342", "title": "Choosing with confidence", "details": "- Living CTA → ‘Sheers with light-filtering layers’\n- Bedroom CTA → ‘Blockout with a sheer layer’\n- Media room CTA → ‘Theatre Room Curtains’"}, {"id": "551fb08d", "title": "Process", "details": "- Consult\n- Measure\n- Select fabric\n- Handcrafted\n- Installed and styled"}, {"id": "ccaeae91", "title": "Fabrics", "details": "- Image & text\n- The finest fabrics and finishes\n- CTA → ‘Explore fabrics’"}, {"id": "34ec1152", "title": "Automation upsell", "details": "Contextual band for motorisation (an upsell, per the services list)."}, {"id": "bf0d0a34", "title": "FAQ", "details": "Product-level accordion for long-tail SEO."}, {"id": "eea218d4", "title": "Curtains in recent homes", "details": "Project slider with images and click through to individual projects"}, {"id": "d6ccab06", "title": "CTA Section", "details": "- Let''s design your curtains together\n- CTA → ‘Book a Design Consultation’ & ‘Onsite visit’"}, {"id": "fb19a672", "title": "Footer", "details": ""}]'::jsonb, 1);
  end if;

  -- T3 Service Child
  update sitemap_page_templates set name = 'Service Child', description = 'Single product page, e.g. Sheer Curtains. Overview, gallery, fabrics, specs, pair with, FAQ and related products.', blocks = '[{"id": "04de2084", "title": "Nav bar", "details": ""}, {"id": "c6453c0a", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’ & ‘Explore the range’"}, {"id": "8fb80402", "title": "Breadcrumbs", "details": ""}, {"id": "9bfa6154", "title": "Overview", "details": "Short story-led intro with three benefit ticks. Minimal text."}, {"id": "59943e89", "title": "Gallery", "details": "Full-width project images, room first & then close-ups."}, {"id": "c3ea0167", "title": "Fabrics and headings", "details": "Swatch row and heading chips. \"Order swatches\" supports the direct-ordering path."}, {"id": "6bbb2a6e", "title": "Performance and specs", "details": "Spec table with downloadable spec sheets, care guide and certifications. Spec values are placeholders until supplied."}, {"id": "dcfd863c", "title": "Pair with", "details": "Cross-links to complementary children, for internal linking and upsell."}, {"id": "c7ccd00d", "title": "FAQ", "details": "Product-level accordion for long-tail SEO."}, {"id": "9bdd4901", "title": "Related products", "details": "Four sibling or neighbouring pages.\n- Blockout Curtains\n- Roman Blinds\n- Roller Blinds\n- Fabrics"}, {"id": "e8ccca16", "title": "CTA Section", "details": "- Let''s design your sheer curtains together\n- CTA → ‘Book a Design Consultation’ & ‘Onsite visit’"}, {"id": "ef02e839", "title": "Footer", "details": ""}]'::jsonb, sort_order = 2
  where sitemap_id = sm and upper(code) = 'T3';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T3', 'Service Child', 'Single product page, e.g. Sheer Curtains. Overview, gallery, fabrics, specs, pair with, FAQ and related products.', '[{"id": "04de2084", "title": "Nav bar", "details": ""}, {"id": "c6453c0a", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’ & ‘Explore the range’"}, {"id": "8fb80402", "title": "Breadcrumbs", "details": ""}, {"id": "9bfa6154", "title": "Overview", "details": "Short story-led intro with three benefit ticks. Minimal text."}, {"id": "59943e89", "title": "Gallery", "details": "Full-width project images, room first & then close-ups."}, {"id": "c3ea0167", "title": "Fabrics and headings", "details": "Swatch row and heading chips. \"Order swatches\" supports the direct-ordering path."}, {"id": "6bbb2a6e", "title": "Performance and specs", "details": "Spec table with downloadable spec sheets, care guide and certifications. Spec values are placeholders until supplied."}, {"id": "dcfd863c", "title": "Pair with", "details": "Cross-links to complementary children, for internal linking and upsell."}, {"id": "c7ccd00d", "title": "FAQ", "details": "Product-level accordion for long-tail SEO."}, {"id": "9bdd4901", "title": "Related products", "details": "Four sibling or neighbouring pages.\n- Blockout Curtains\n- Roman Blinds\n- Roller Blinds\n- Fabrics"}, {"id": "e8ccca16", "title": "CTA Section", "details": "- Let''s design your sheer curtains together\n- CTA → ‘Book a Design Consultation’ & ‘Onsite visit’"}, {"id": "ef02e839", "title": "Footer", "details": ""}]'::jsonb, 2);
  end if;

  -- T4 Standard Internal
  update sitemap_page_templates set name = 'Standard Internal', description = 'About-style page. Story, purpose, values, team, child page cards, how we work and reassurance.', blocks = '[{"id": "05bb90f1", "title": "Nav bar", "details": ""}, {"id": "648dab62", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’"}, {"id": "2fb66588", "title": "Breadcrumbs", "details": ""}, {"id": "47698940", "title": "Our story", "details": "Split layout with image and narrative. Tells the brand story and introduces the people behind it.\nCTA → ‘Meet the Team’"}, {"id": "c863ba1c", "title": "Purpose statement", "details": "Full-width statement band using the brand purpose line."}, {"id": "63d3c2ef", "title": "Values", "details": "Six brand values in a card grid."}, {"id": "8b1f7cd4", "title": "Team", "details": "- Paragraph of copy\n- Team photo\n- Cta → ‘Meet the team’"}, {"id": "c3bf9a47", "title": "Child page cards", "details": "Sub-navigation to the four About children. On other pages this module becomes related pages.\n- Commercial\n- Sustainability\n- Aftercare"}, {"id": "28c932cd", "title": "How We Work", "details": "- Strength-based approach\n- Community-led solutions\n- Culturally safe delivery\n- Tailored to each community"}, {"id": "41bef898", "title": "Reassurance", "details": "A testimonial plus warranty and certification proof."}, {"id": "df73afe5", "title": "Closing CTA", "details": "Showroom consultation and showrooms link. Come and spend an hour with us. CTA → ‘Book a Design Consultation’ & ‘View our showrooms’"}, {"id": "84b27e8c", "title": "Footer", "details": ""}]'::jsonb, sort_order = 3
  where sitemap_id = sm and upper(code) = 'T4';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T4', 'Standard Internal', 'About-style page. Story, purpose, values, team, child page cards, how we work and reassurance.', '[{"id": "05bb90f1", "title": "Nav bar", "details": ""}, {"id": "648dab62", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’"}, {"id": "2fb66588", "title": "Breadcrumbs", "details": ""}, {"id": "47698940", "title": "Our story", "details": "Split layout with image and narrative. Tells the brand story and introduces the people behind it.\nCTA → ‘Meet the Team’"}, {"id": "c863ba1c", "title": "Purpose statement", "details": "Full-width statement band using the brand purpose line."}, {"id": "63d3c2ef", "title": "Values", "details": "Six brand values in a card grid."}, {"id": "8b1f7cd4", "title": "Team", "details": "- Paragraph of copy\n- Team photo\n- Cta → ‘Meet the team’"}, {"id": "c3bf9a47", "title": "Child page cards", "details": "Sub-navigation to the four About children. On other pages this module becomes related pages.\n- Commercial\n- Sustainability\n- Aftercare"}, {"id": "28c932cd", "title": "How We Work", "details": "- Strength-based approach\n- Community-led solutions\n- Culturally safe delivery\n- Tailored to each community"}, {"id": "41bef898", "title": "Reassurance", "details": "A testimonial plus warranty and certification proof."}, {"id": "df73afe5", "title": "Closing CTA", "details": "Showroom consultation and showrooms link. Come and spend an hour with us. CTA → ‘Book a Design Consultation’ & ‘View our showrooms’"}, {"id": "84b27e8c", "title": "Footer", "details": ""}]'::jsonb, 3);
  end if;

  -- T5 Journal Parent
  update sitemap_page_templates set name = 'Journal Parent', description = 'Journal home. Featured story, category filters, story grid and newsletter.', blocks = '[{"id": "91b3234f", "title": "Nav bar", "details": ""}, {"id": "2695f01d", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’"}, {"id": "996e3fea", "title": "Breadcrumbs", "details": ""}, {"id": "02dc0783", "title": "Featured story", "details": "One large editorial feature, image-led, for the latest project or trend."}, {"id": "3998f2bd", "title": "Category filters", "details": "Inspiration, Projects, Fabrics and trends, Automation, Care and aftercare, Behind the scenes."}, {"id": "10c63771", "title": "Story grid", "details": "Three-column card grid with category, title and date. Load more keeps the page light."}, {"id": "2330447a", "title": "Newsletter and Instagram", "details": "Email capture and a social strip. Supports the Reels-first content plan from the brand strategy."}, {"id": "a5fe6729", "title": "Closing CTA", "details": "Moves readers from inspiration to a consultation."}, {"id": "aad93df7", "title": "Footer", "details": ""}]'::jsonb, sort_order = 4
  where sitemap_id = sm and upper(code) = 'T5';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T5', 'Journal Parent', 'Journal home. Featured story, category filters, story grid and newsletter.', '[{"id": "91b3234f", "title": "Nav bar", "details": ""}, {"id": "2695f01d", "title": "Page Header", "details": "Clear category intro\nCTA → ‘Book a Design Consultation’"}, {"id": "996e3fea", "title": "Breadcrumbs", "details": ""}, {"id": "02dc0783", "title": "Featured story", "details": "One large editorial feature, image-led, for the latest project or trend."}, {"id": "3998f2bd", "title": "Category filters", "details": "Inspiration, Projects, Fabrics and trends, Automation, Care and aftercare, Behind the scenes."}, {"id": "10c63771", "title": "Story grid", "details": "Three-column card grid with category, title and date. Load more keeps the page light."}, {"id": "2330447a", "title": "Newsletter and Instagram", "details": "Email capture and a social strip. Supports the Reels-first content plan from the brand strategy."}, {"id": "a5fe6729", "title": "Closing CTA", "details": "Moves readers from inspiration to a consultation."}, {"id": "aad93df7", "title": "Footer", "details": ""}]'::jsonb, 4);
  end if;

  -- T6 Journal Child
  update sitemap_page_templates set name = 'Journal Child', description = 'A single story. Article hero, featured products for internal linking and related stories.', blocks = '[{"id": "b19fa266", "title": "Nav bar", "details": ""}, {"id": "56678c9a", "title": "Header and reading progress", "details": "Global header with a thin reading-progress line beneath it."}, {"id": "e627ff72", "title": "Article hero", "details": "Image with category, title, date, read time and author."}, {"id": "ba35ba9c", "title": "Featured in this story", "details": "Links to the product pages (Template 3) used in the project. This is the main internal linking module."}, {"id": "fbc821e4", "title": "Article CTA", "details": "Consultation prompt right after the story, plus the sticky CTA throughout."}, {"id": "5b25641d", "title": "Related stories", "details": "Three more stories, matched on category."}, {"id": "5cf9dbc2", "title": "Footer", "details": ""}]'::jsonb, sort_order = 5
  where sitemap_id = sm and upper(code) = 'T6';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T6', 'Journal Child', 'A single story. Article hero, featured products for internal linking and related stories.', '[{"id": "b19fa266", "title": "Nav bar", "details": ""}, {"id": "56678c9a", "title": "Header and reading progress", "details": "Global header with a thin reading-progress line beneath it."}, {"id": "e627ff72", "title": "Article hero", "details": "Image with category, title, date, read time and author."}, {"id": "ba35ba9c", "title": "Featured in this story", "details": "Links to the product pages (Template 3) used in the project. This is the main internal linking module."}, {"id": "fbc821e4", "title": "Article CTA", "details": "Consultation prompt right after the story, plus the sticky CTA throughout."}, {"id": "5b25641d", "title": "Related stories", "details": "Three more stories, matched on category."}, {"id": "5cf9dbc2", "title": "Footer", "details": ""}]'::jsonb, 5);
  end if;

  -- T7 Contact / Map
  update sitemap_page_templates set name = 'Contact / Map', description = 'Contact and showroom pages. Choose how to begin, enquiry form, map and showrooms, reassurance and FAQ.', blocks = '[{"id": "09d08c4b", "title": "Nav bar", "details": ""}, {"id": "5fd35322", "title": "Page Header", "details": "CTA → ‘Book a Design Consultation’ & ‘(08) 9244 8977’"}, {"id": "09f07c07", "title": "Choose how to begin", "details": "Four cards: design consultation, onsite visit, order direct and aftercare. The choice sets the enquiry type, and the consultation is selected by default."}, {"id": "969b43e4", "title": "Enquiry form", "details": "- Name\n- Email\n- Mobile\n- Suburb\n- Preferred Showroom\n- Preferred Day & Time\n- Your project\nCTA → ‘Request a consultation’"}, {"id": "f0b63f17", "title": "Map and showrooms", "details": "A large map with both showroom pins, addresses, hours, directions and a Book a visit button for each."}, {"id": "a05d4d8f", "title": "Reassurance", "details": "A testimonial plus warranty and certification proof."}, {"id": "543d042c", "title": "FAQ - Before you visit", "details": "Handles the last objections, and filters out price shoppers and quote-only enquiries."}, {"id": "e64be0cf", "title": "Footer", "details": ""}]'::jsonb, sort_order = 6
  where sitemap_id = sm and upper(code) = 'T7';
  if not found then
    insert into sitemap_page_templates (sitemap_id, code, name, description, blocks, sort_order)
    values (sm, 'T7', 'Contact / Map', 'Contact and showroom pages. Choose how to begin, enquiry form, map and showrooms, reassurance and FAQ.', '[{"id": "09d08c4b", "title": "Nav bar", "details": ""}, {"id": "5fd35322", "title": "Page Header", "details": "CTA → ‘Book a Design Consultation’ & ‘(08) 9244 8977’"}, {"id": "09f07c07", "title": "Choose how to begin", "details": "Four cards: design consultation, onsite visit, order direct and aftercare. The choice sets the enquiry type, and the consultation is selected by default."}, {"id": "969b43e4", "title": "Enquiry form", "details": "- Name\n- Email\n- Mobile\n- Suburb\n- Preferred Showroom\n- Preferred Day & Time\n- Your project\nCTA → ‘Request a consultation’"}, {"id": "f0b63f17", "title": "Map and showrooms", "details": "A large map with both showroom pins, addresses, hours, directions and a Book a visit button for each."}, {"id": "a05d4d8f", "title": "Reassurance", "details": "A testimonial plus warranty and certification proof."}, {"id": "543d042c", "title": "FAQ - Before you visit", "details": "Handles the last objections, and filters out price shoppers and quote-only enquiries."}, {"id": "e64be0cf", "title": "Footer", "details": ""}]'::jsonb, 6);
  end if;

  -- Page assignments from the Figma sitemap
  update sitemap_pages p set template_id = t.id
  from (values
    ('/', 'T1'),
    ('/book-a-consultation/', 'T7'),
    ('/contact/', 'T7'),
    ('/about/', 'T4'),
    ('/about/commercial/', 'T4'),
    ('/about/sustainability/', 'T4'),
    ('/about/aftercare/', 'T4'),
    ('/about/our-team/', 'T4'),
    ('/curtains/', 'T2'),
    ('/blinds/', 'T2'),
    ('/outdoors/', 'T2'),
    ('/wall-coverings/', 'T2'),
    ('/soft-furnishings/', 'T2'),
    ('/brands/', 'T4'),
    ('/showrooms/', 'T4'),
    ('/showrooms/osborne-park/', 'T7'),
    ('/showrooms/claremont/', 'T7'),
    ('/journal/', 'T5'),
    ('/automation/', 'T4'),
    ('/curtains/sheer-curtains/', 'T3'),
    ('/curtains/blockout-curtains/', 'T3'),
    ('/curtains/curtain-styles/', 'T3'),
    ('/curtains/motorised-curtains/', 'T3'),
    ('/curtains/curtain-tracks/', 'T3'),
    ('/curtains/theatre-room-curtains/', 'T3'),
    ('/curtains/fabrics/', 'T3'),
    ('/blinds/roller-blinds/', 'T3'),
    ('/blinds/roman-blinds/', 'T3'),
    ('/blinds/honeycomb-blinds/', 'T3'),
    ('/blinds/soft-shades/', 'T3'),
    ('/blinds/plantation-shutters/', 'T3'),
    ('/blinds/verosol-blinds/', 'T3'),
    ('/blinds/motorised-blinds/', 'T3'),
    ('/outdoors/awnings/', 'T3'),
    ('/outdoors/alfresco-blinds/', 'T3'),
    ('/outdoors/louvred-roof/', 'T3'),
    ('/outdoors/retractable-pergola/', 'T3'),
    ('/outdoors/external-venetian-blinds/', 'T3'),
    ('/wall-coverings/wall-paper/', 'T3'),
    ('/wall-coverings/wall-murals/', 'T3'),
    ('/wall-coverings/wall-textures/', 'T3'),
    ('/wall-coverings/wall-panels/', 'T3'),
    ('/soft-furnishings/custom-rugs/', 'T3'),
    ('/soft-furnishings/custom-cushions/', 'T3'),
    ('/soft-furnishings/upholstery/', 'T3')
  ) as m(url, code)
  join sitemap_page_templates t on t.sitemap_id = sm and upper(t.code) = m.code
  where p.sitemap_id = sm and lower(p.url) = m.url;
  get diagnostics n = row_count;
  raise notice 'Pages pointed at a Figma template: %', n;
end $$;

commit;

-- Check: every Indeko page and its template
-- select p.url, p.name, t.code, t.name as template
-- from sitemap_pages p
-- join sitemaps s on s.id = p.sitemap_id join clients c on c.id = s.client_id
-- left join sitemap_page_templates t on t.id = p.template_id
-- where c.name ilike 'indeko%' order by p.url;
