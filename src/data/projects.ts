import type { Project } from './schema'

// Newest first.
export const projects: Project[] = [
  {
    id: 'fitts',
    title: 'Fitts',
    description: {
      sentence:
        'A desktop AI agent, built solo for the Meta Global AI Hackathon, that audits web and Android apps and fixes their bugs.',
      paragraph:
        "A desktop AI agent, built solo for the Meta Global AI Hackathon, that audits web and Android apps and fixes their bugs. It pairs deterministic in-page probes with five LLM reviewer personas to grade UX against Nielsen's 10 heuristics, finding 7x as many planted issues as axe at $0.15 a run. An autonomous fix loop then verifies each fix in a git worktree and rolls back any failures, while a network gate holds destructive requests until the owner answers.",
      bullets: [
        'Solo-built fitts.allenzheng.com, a desktop AI agent that audits web and Android apps and fixes their bugs',
        'Found 7x as many planted issues as axe (28/33) at $0.15 a run, and 3x as many on a blind held-out app',
        "Combined deterministic in-page probes with 5 LLM reviewer personas to grade UX against Nielsen's 10 heuristics",
        'Orchestrated 7 Meta models across Economy, Quality, and open-weight profiles with a capped per-call cost ledger',
        'Built an autonomous fix loop that verified 13 of 16 queued fixes in a git worktree, rolling back any failures',
        'Cut bugs to their fewest steps with delta debugging, exporting repros as Playwright tests or Maestro flows',
        'Secured the agent with a network gate holding destructive requests and a code-enforced edit allowlist',
        'Shipped 60K+ lines of TypeScript and 880+ tests, with CI releasing Windows, macOS, and Linux builds',
      ],
    },
    period: { start: '2026-10', end: '2026-11' },
    role: 'Sole developer',
    stack: [
      'TypeScript',
      'Electron',
      'React',
      'Vite',
      'Tailwind CSS',
      'Three.js',
      'Node.js',
      'pnpm',
      'Playwright',
      'Vitest',
      'Maestro',
      'Android',
      'adb',
      'Meta Muse',
      'SAM 3.1',
      'Baseten',
      'ElevenLabs',
      'GitHub Actions',
    ],
    links: {
      live: 'https://fitts.allenzheng.com',
      source: 'https://github.com/AllenZheng-05/fitts',
      video: 'https://youtu.be/CV27fWbfVdA',
    },
    media: [
      {
        kind: 'embed',
        src: 'https://www.youtube-nocookie.com/embed/CV27fWbfVdA',
        alt: 'Fitts demo video',
      },
    ],
  },
  {
    id: 'reagent',
    title: 'Reagent',
    description: {
      sentence:
        'An enterprise AI-agent platform where every agent inherits org-wide models, tools, and guardrails.',
      paragraph:
        'An enterprise AI-agent platform where every agent inherits org-wide models, tools, and guardrails. A tighten-only policy resolver enforces least privilege across three config layers, a LangGraph runtime enforces budgets and human-in-the-loop approvals, and a 7-stage CI/CD pipeline gates every agent release on security review, human-approved tests, and evals. It placed 3rd of 32 teams in HackTX’s NorthMark Compute & Cloud track.',
      bullets: [
        'Architected an enterprise AI-agent platform where every agent inherits org-wide models, tools, and guardrails',
        'Engineered a tighten-only policy resolver enforcing least privilege across 3 config layers, proven by 62 rule tests',
        'Built a LangGraph runtime enforcing agent budgets, step caps, timeouts, and human-in-the-loop approvals',
        'Designed a 7-stage CI/CD pipeline gating every agent release on security review, human-approved tests, and evals',
        'Built a statistically rigorous eval engine scoring repeated sandboxed runs with 95% Wilson confidence intervals',
        'Shipped 6 meta-agents that draft new agents, write tests, audit permissions, triage failures, and cut model costs',
        'Built shared semantic, episodic, and procedural agent memory, adopting new lessons only once evals pass',
        'Integrated GitHub and Slack as MCP tool servers, letting agents review pull requests and answer Slack mentions',
        "Placed 3rd of 32 teams in HackTX's NorthMark Compute & Cloud track, out of 234 projects submitted",
      ],
    },
    period: { start: '2026-10' },
    award: 'HackTX 2026 — NMC2 Track 3rd Place',
    stack: [
      'Python',
      'FastAPI',
      'PostgreSQL',
      'LangGraph',
      'LangChain',
      'MCP',
      'OpenRouter',
      'Next.js',
      'React',
      'TypeScript',
      'pytest',
      'Typer',
      'Docker',
      'GitHub Actions',
    ],
    links: {
      source: 'https://github.com/hanhg/Reagent',
    },
  },
  {
    id: 'open-team-sheets',
    title: 'Open Team Sheets',
    description: {
      sentence: 'An open-source search engine and team builder for competitive Pokémon VGC teams.',
      paragraph:
        'An open-source search engine and team builder for competitive Pokémon VGC teams, covering 38K+ teams from 300 events. It runs on a PostgreSQL schema with GIN-indexed tag search and row-level security, and 1024-bit bitset masks cut box-search queries from 73–88ms to 24–29ms, ending 3s+ production timeouts. GitHub Actions cron jobs import new tournaments automatically.',
      bullets: [
        'Founded and solo-built openteamsheets.com, an open-source search site for 38K+ Pokémon VGC teams',
        'Designed a PostgreSQL schema with GIN-indexed tag search by Pokémon, moves, items, abilities, and types',
        'Secured user data with PostgreSQL row-level security (RLS) policies and security-definer functions',
        'Cut box-search queries from 73–88ms to 24–29ms with 1024-bit bitset masks, ending 3s+ production timeouts',
        'Automated tournament imports with GitHub Actions cron jobs, ingesting 49K+ placements from 300 events',
        'Built a Showdown/RK9 team-sheet parser and validator that flags errors in official sheets and suggests fixes',
        'Added accessibility with keyboard-navigable ARIA comboboxes, tabs, and dialogs, plus screen-reader live regions',
        'Set up CI gating every PR on format, lint, typecheck, build, 186 Vitest unit tests, and pgTAP database tests',
      ],
    },
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
    description: {
      sentence: 'ACM UTD’s open-source catalog of course grade distributions.',
      paragraph:
        'ACM UTD’s open-source catalog of course grade distributions, covering every section since 2017. I built sorting and filtering by mean GPA and median grade, queried in-browser over SQLite, fixed a 4-year-old bug that excluded F grades from every section, and redesigned the header and results toolbar.',
      bullets: [
        'Contributed to utdgrades.com, ACM UTD’s open-source grade-distribution site covering every section since 2017',
        'Built sorting and filtering of sections by mean GPA and median grade, queried in-browser over SQLite via sql.js',
        'Fixed a 4-year-old bug excluding F grades from every section, which undercounted class sizes and skewed averages',
        'Redesigned the header and results toolbar in React and Tailwind CSS, merging search, sort, and filter',
      ],
    },
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
    description: {
      sentence:
        'Built a data pipeline and weighted scoring model to increase the workflow efficiency of the Fort Worth Community Land Trust.',
      paragraph:
        'Built a data pipeline and weighted scoring model to increase the workflow efficiency of the Fort Worth Community Land Trust. The model objectively ranks the best census land tracts to invest in, and an interactive dashboard with street-level imagery lets the client assess tracts remotely. We pitched the data-driven recommendation to JPMorganChase and client judges, winning among 20+ teams.',
      bullets: [
        'Built a data pipeline automating the workflow of our client, the Fort Worth Community Land Trust',
        'Created a weighted scoring model to objectively rank the best census land tracts to invest in',
        'Identified community centers near high-priority land tracts and ways to facilitate outreach in those areas',
        'Built interactive dashboard with street-level imagery and information to assess land tracts remotely',
        'Pitched a data-driven strategic recommendation to JPMorganChase and client judges, winning among 20+ teams',
      ],
    },
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
    description: {
      sentence:
        'My Data Analysis course project testing what actually predicts a Netflix title’s rating and viewership.',
      paragraph:
        'My Data Analysis course project: what actually predicts a Netflix title’s rating and viewership? Genre is the strongest predictor of IMDb score via one-way ANOVA (F = 64.61, p < 0.001), and IMDb score is only weakly correlated (r = 0.23) with global top-10 viewership.',
      bullets: [
        'Collaborated with two students to analyze 8,807 Netflix titles in R, joining catalog, IMDb rating, and weekly global streaming datasets to test genre, country, and description sentiment as predictors of rating and viewership',
        'Ran one-way ANOVA tests identifying genre as the strongest predictor of IMDb score (F = 64.61, p < 0.001), spanning a 2-point spread from horror (5.37) to Crime TV (7.25)',
        'Confirmed country of origin as a significant predictor (ANOVA F = 14.32, p < 0.001), with South Korean titles averaging a 7.25 IMDb score vs. 6.57 for the U.S.',
        'Built an AFINN-lexicon sentiment model with tidytext on title descriptions, distinguishing a statistically significant but practically negligible signal (r = 0.055, p = 0.001) from a genuine predictor',
        'Found IMDb score only weakly correlated (r = 0.23) with Netflix global top-10 viewership, showing critical reception and streaming popularity are distinct outcomes',
      ],
    },
    period: { start: '2026-03', end: '2026-05' },
    stack: ['R', 'tidyverse', 'tidytext', 'ANOVA', 'Sentiment Analysis'],
    links: {},
  },
  {
    id: 'mindcraft',
    title: 'MindCraft',
    description: {
      sentence:
        'A full-stack machine learning platform with a pipeline that takes you from raw data (tabular or image) to a fully trained and deployed model using Random Forest and MobileNetV2 transfer learning.',
      paragraph:
        'A full-stack machine learning platform with a pipeline that takes you from raw data (tabular or image) to a fully trained and deployed model in five minutes, using Random Forest and MobileNetV2 transfer learning. Gemini and GitHub APIs generate a repo with a full demo of each trained model deployed to Vercel, and a live Canvas visualization animates the Random Forest’s decision trees as it trains.',
      bullets: [
        'Built a full-stack ML platform enabling users to go from raw data to deployed ML model in 5 minutes',
        'Designed ML pipeline supporting tabular/image data using Random Forest + MobileNetV2 transfer learning',
        'Integrated Gemini + GitHub APIs to create GitHub repos of full demos of trained models deployed to Vercel',
        'Built the frontend in React, TypeScript, and Tailwind CSS, architecting a custom drag-resizable 3-panel workspace with state synced to live model-training API calls',
        'Engineered a live Canvas visualization animating the Random Forest’s decision trees via requestAnimationFrame, reflecting training progress through dynamic brightness/pulse effects',
      ],
    },
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
    description: {
      sentence: 'A version-controlled resume editor that tailors your resume to a job description.',
      paragraph:
        'A version-controlled desktop resume editor that tailors your resume to a job description in seconds. A custom graph engine powers version control, AWS DynamoDB and S3 store and generate resumes, and retrieval-augmented generation on AWS Bedrock answers user queries. An LLM scoring system benchmarks each resume against the job description with targeted feedback.',
      bullets: [
        'Developed a version-controlled desktop resume editor that helps users generate job-specific resumes in seconds',
        'Architected a NoSQL database on AWS DynamoDB + S3 for resume management and generation',
        'Engineered RESTful APIs with Express.js and documented endpoints in Swagger/OpenAPI format',
        'Integrated Retrieval-Augmented Generation using AWS Bedrock to answer user queries and searches',
        'Implemented secure authentication flow using AWS Cognito, ensuring user data integrity',
        'Architected version control system using a custom graph engine',
        'Engineered LLM scoring system to benchmark resumes against job descriptions with targeted feedback',
      ],
    },
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
    description: {
      sentence:
        'A meal-tracking app that uses image recognition to analyze the nutritional content and breakdown of your diet.',
      paragraph:
        'A meal-tracking app that uses image recognition to analyze the nutritional content and breakdown of your diet. Meal photos become personalized nutrition breakdowns, and eight Recharts dashboards show macronutrient trends and progress over time.',
      bullets: [
        'Built AI-powered food tracking app that uses image recognition to analyze meal photos and provide personalized nutrition breakdowns',
        'Developed responsive frontend with React and Flask, supporting real-time feedback and seamless cross-device performance',
        'Designed 8 data visualization dashboards using Recharts to display the most prominent macronutrient trends and progress over time',
      ],
    },
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
    description: {
      sentence: 'A travel-planning app built with logic programming.',
      paragraph:
        'A travel-planning app built with logic programming. It uses s(CASP) and recursive reasoning algorithms to evaluate thousands of route permutations, generating optimized travel routes and cost estimates in seconds.',
      bullets: [
        'Created intelligent travel planner leveraging logic programming and s(CASP) to automatically generate optimized travel routes and cost estimates in seconds',
        'Collaboratively developed and implemented recursive reasoning algorithms using problem-solving techniques to evaluate thousands of route permutations in seconds',
      ],
    },
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
    description: {
      sentence:
        'An iOS app with detailed news and information about the 2024 election and its candidates.',
      paragraph:
        'An iOS app with detailed news and information about the 2024 election and its candidates. Built in Swift, it centralizes coverage from hundreds of news articles, pulling real-time content from NewsAPI and YouTube and keeping structured candidate data up to date throughout the election cycle.',
      bullets: [
        'Developed iOS app in Swift centralizing election news and candidate info from hundreds of news articles',
        'Integrated RESTful endpoints (NewsAPI, YouTubeAPI) for real-time content delivery and user engagement',
        'Designed database for structured candidate data, ensuring consistent updates throughout the election cycle',
      ],
    },
    period: { start: '2023-07', end: '2023-10' },
    award: 'Congressional App Challenge — 2nd Place',
    stack: ['Swift', 'Xcode', 'REST APIs'],
    links: {
      source: 'https://github.com/AllenZheng-05/Candidate-Compass',
    },
  },
]
