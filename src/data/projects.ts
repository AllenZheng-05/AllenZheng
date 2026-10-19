import type { Project } from './schema'

// Newest first.
export const projects: Project[] = [
  {
    id: 'open-team-sheets',
    title: 'Open Team Sheets',
    description: 'An open-source search engine and team builder for competitive Pokémon VGC teams.',
    period: { start: '2026-09', end: 'present' },
    role: 'Founder & sole developer',
    stack: [
      'TypeScript',
      'Next.js',
      'React',
      'PostgreSQL',
      'Supabase',
      'Tailwind CSS',
      'Hono',
      'GitHub Actions',
    ],
    links: {
      live: 'https://openteamsheets.com',
      source: 'https://github.com/AllenZheng-05/openTeamSheets',
    },
  },
  {
    id: 'utd-grades',
    title: 'UTD Grades',
    description: 'ACM UTD’s open-source catalog of course grade distributions.',
    period: { start: '2026-09', end: 'present' },
    role: 'Contributor',
    stack: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'SQLite', 'sql.js', 'Jest'],
    links: {
      live: 'https://utdgrades.com',
      source: 'https://github.com/acmutd/utd-grades',
    },
  },
  {
    id: 'jpmc-data-for-good',
    title: 'Data for Good: Fort Worth Community Land Trust',
    description:
      'Built a data pipeline and weighted scoring model to increase the workflow efficiency of the Fort Worth Community Land Trust.',
    period: { start: '2026-04' },
    award: 'JPMorganChase Data for Good Hackathon 2026 — Winner',
    stack: ['Data Analysis', 'Scoring Models', 'Dashboards', 'Strategy'],
    // The codebase is confidential, so this links to the LinkedIn write-up instead.
    links: {
      post: 'https://www.linkedin.com/posts/allen-zheng05_dataforgood-share-7449188457861767169-JxsG',
    },
  },
  {
    id: 'netflix-content-analysis',
    title: 'Netflix Content Analysis',
    description:
      'My Data Analysis course project: what actually predicts a Netflix title’s rating and viewership? Genre is the strongest predictor of IMDb score via one-way ANOVA (F = 64.61, p < 0.001), and IMDb score is only weakly correlated (r = 0.23) with global top-10 viewership.',
    period: { start: '2026-03', end: '2026-05' },
    stack: ['R', 'tidyverse', 'tidytext', 'ANOVA', 'Sentiment Analysis'],
    links: {},
  },
  {
    id: 'mindcraft',
    title: 'MindCraft',
    description:
      'A full-stack machine learning platform with a pipeline that takes you from raw data (tabular or image) to a fully trained and deployed model using Random Forest and MobileNetV2 transfer learning.',
    period: { start: '2026-03' },
    award: 'HackAI 2026 — Track Winner',
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'TensorFlow', 'Python', 'Canvas'],
    links: {
      source: 'https://github.com/AllenZheng-05/HackAI',
      demo: 'https://devpost.com/software/mindcraft-13aics',
    },
  },
  {
    id: 'docbranch',
    title: 'DocBranch',
    description:
      'A version-controlled resume editor that tailors your resume to a job description.',
    period: { start: '2025-09', end: '2025-12' },
    stack: ['Electron', 'React', 'TypeScript', 'Express', 'AWS', 'RAG'],
    links: {
      source: 'https://github.com/acm-projects/DocBranch',
      video: 'https://www.youtube.com/watch?v=Q4CYBV41KRI&t=3333s',
    },
  },
  {
    id: 'forkast',
    title: 'Forkast',
    description:
      'A meal-tracking app that uses image recognition to analyze the nutritional content and breakdown of your diet.',
    period: { start: '2025-02' },
    award: 'Axxess Hackathon 2025 — Track Winner',
    stack: ['React Native', 'Python', 'Flask', 'Recharts', 'NumPy'],
    links: {
      source: 'https://github.com/AllenZheng-05/hackaxxess25',
      demo: 'https://devpost.com/software/forkcast',
    },
  },
  {
    id: 'wanderlogic',
    title: 'WanderLogic',
    description: 'A travel-planning app built with logic programming.',
    period: { start: '2025-01' },
    award: 'HackReason 2025 — 3rd Place Overall',
    stack: ['Prolog', 's(CASP)', 'Python'],
    links: {
      source: 'https://github.com/AllenZheng-05/hackreason25',
      demo: 'https://devpost.com/software/team-ud086l',
    },
  },
  {
    id: 'candidate-compass',
    title: 'Candidate Compass',
    description:
      'An iOS app with detailed news and information about the 2024 election and its candidates.',
    period: { start: '2023-07', end: '2023-10' },
    award: 'Congressional App Challenge — 2nd Place',
    stack: ['Swift', 'Xcode', 'REST APIs'],
    links: {
      source: 'https://github.com/AllenZheng-05/Candidate-Compass',
    },
  },
]
