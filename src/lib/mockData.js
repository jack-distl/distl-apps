// Mock data for development — matches the OKR planner data model
// Will be replaced by Supabase queries when database is connected

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

// OKR planner data keyed by client ID
// Each client has periods → objectives → key results
export const mockOkrData = {
  '1': {
    abbreviation: 'ACM',
    retainerAmount: 5400,
    periods: [
      {
        id: 'p1',
        startMonth: 1,
        startYear: 2026,
        endMonth: 3,
        endYear: 2026,
        isPublished: false,
        goal: 'Increase organic traffic by 30% and improve local SEO rankings',
        offsiteAllowancePercent: 5,
        adminTasks: {
          monthlyReportingAM: 1,
          monthlyReportingSEO: 2,
          okrReportingAM: 1,
          okrReportingSEO: 2,
        },
        objectives: [
          {
            id: 'o1',
            title: 'Technical Website Optimisations',
            scope: 'sitewide',
            scopeDetail: '',
            keyResults: [
              { id: 'kr1', task: 'Technical Site Audit', description: 'Run Screaming Frog crawl & document all issues', amHours: 0.5, seoHours: 3.5, status: 'complete' },
              { id: 'kr2', task: 'Schema Markup Implementation', description: 'Add LocalBusiness and FAQPage schema', amHours: 0, seoHours: 3, status: 'pending' },
              { id: 'kr3', task: 'Core Web Vitals Audit', description: 'Audit and fix LCP, FID, CLS issues', amHours: 0, seoHours: 3, status: 'pending' },
            ],
          },
          {
            id: 'o2',
            title: 'Local SEO & Google Business Profile',
            scope: 'sitewide',
            scopeDetail: '',
            keyResults: [
              { id: 'kr4', task: 'Google Business Profile Optimisation', description: 'Full GBP audit and optimisation', amHours: 0.5, seoHours: 2, status: 'complete' },
              { id: 'kr5', task: 'Local Citation Building', description: 'Build 15 local citations across key directories', amHours: 0, seoHours: 3, status: 'pending' },
              { id: 'kr6', task: 'Review Management Strategy', description: 'Set up review generation workflow', amHours: 1, seoHours: 1, status: 'pending' },
            ],
          },
        ],
      },
    ],
  },
  '2': {
    abbreviation: 'SRB',
    retainerAmount: 3600,
    periods: [
      {
        id: 'p2',
        startMonth: 1,
        startYear: 2026,
        endMonth: 3,
        endYear: 2026,
        isPublished: true,
        goal: 'Launch new eCommerce store and drive initial traffic',
        offsiteAllowancePercent: 5,
        adminTasks: {
          monthlyReportingAM: 1,
          monthlyReportingSEO: 1,
          okrReportingAM: 0,
          okrReportingSEO: 1,
        },
        objectives: [
          {
            id: 'o3',
            title: 'Keyword Research & Strategy',
            scope: 'sitewide',
            scopeDetail: '',
            keyResults: [
              { id: 'kr7', task: 'Keyword Research', description: 'Full keyword research for eCommerce categories', amHours: 0.5, seoHours: 3.5, status: 'complete' },
              { id: 'kr8', task: 'Keyword Mapping', description: 'Map keywords to product and category pages', amHours: 0, seoHours: 2, status: 'pending' },
            ],
          },
        ],
      },
    ],
  },
}
