export const mockClients = [
  {
    id: '1',
    name: 'Acme Construction',
    abbreviation: 'ACM',
    monthly_retainer: 5400,
    is_active: true,
  },
  {
    id: '2',
    name: 'Swan River Brewing',
    abbreviation: 'SRB',
    monthly_retainer: 3600,
    is_active: true,
  },
  {
    id: '3',
    name: 'Perth Dental Group',
    abbreviation: 'PDG',
    monthly_retainer: 7200,
    is_active: true,
  },
  {
    id: '4',
    name: 'Coastal Property Co',
    abbreviation: 'CPC',
    monthly_retainer: 4500,
    is_active: true,
  },
  {
    id: '5',
    name: 'Outback Adventures',
    abbreviation: 'OBA',
    monthly_retainer: 2700,
    is_active: false,
  },
]

export const mockOkrPeriods = [
  {
    id: 'p1',
    client_id: '1',
    label: 'Q1 2026',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    goal: 'Increase organic traffic by 30% and improve local SEO rankings',
    is_published: false,
  },
  {
    id: 'p2',
    client_id: '2',
    label: 'Q1 2026',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    goal: 'Launch new eCommerce store and drive initial traffic',
    is_published: true,
  },
  {
    id: 'p3',
    client_id: '3',
    label: 'Q1 2026',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    goal: 'Dominate Google Maps for dental keywords in Perth metro',
    is_published: false,
  },
]

export const mockObjectives = [
  {
    id: 'o1',
    period_id: 'p1',
    title: 'Technical SEO audit & fixes',
    scope: 'seo',
    sort_order: 0,
    tasks: [
      { id: 't1', description: 'Run Screaming Frog crawl & document issues', am_hours: 0.5, seo_hours: 2, status: 'done' },
      { id: 't2', description: 'Fix critical crawl errors & broken links', am_hours: 0, seo_hours: 4, status: 'in_progress' },
      { id: 't3', description: 'Implement schema markup on key pages', am_hours: 0, seo_hours: 3, status: 'planned' },
    ],
  },
  {
    id: 'o2',
    period_id: 'p1',
    title: 'Local SEO optimisation',
    scope: 'seo',
    sort_order: 1,
    tasks: [
      { id: 't4', description: 'Optimise Google Business Profile', am_hours: 0.5, seo_hours: 2, status: 'done' },
      { id: 't5', description: 'Build 10 local citations', am_hours: 0, seo_hours: 3, status: 'planned' },
      { id: 't6', description: 'Create location-specific landing pages', am_hours: 1, seo_hours: 4, status: 'planned' },
    ],
  },
  {
    id: 'o3',
    period_id: 'p1',
    title: 'Client reporting & strategy',
    scope: 'am',
    sort_order: 2,
    tasks: [
      { id: 't7', description: 'Monthly performance report', am_hours: 3, seo_hours: 1, status: 'in_progress' },
      { id: 't8', description: 'Quarterly strategy review meeting', am_hours: 2, seo_hours: 0.5, status: 'planned' },
    ],
  },
]
