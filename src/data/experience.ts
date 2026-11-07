import acmDevelopmentLogo from '../assets/logos/acm-development.png'
import acmProjectsLogo from '../assets/logos/acm-projects.webp'
import winkLogo from '../assets/logos/wink.png'
import type { Experience } from './schema'

// Newest first.
export const experience: Experience[] = [
  {
    id: 'acm-project-manager',
    role: 'Project Manager',
    org: 'ACM UTD',
    orgUrl: 'https://www.acmutd.co',
    logo: { src: acmProjectsLogo, alt: 'ACM Projects logo', background: 'dark' },
    period: { start: '2026-05', end: 'present' },
    description: {
      sentence:
        'Lead a team of four undergraduate developers building Echo, a fully-produced character-voiced audiobook mobile app.',
      paragraph:
        'Lead a team of four undergraduate developers through five two-week Agile sprints building Echo, an AI-narrated audiobook mobile app. Before kickoff I wrote the feasibility report defining its architecture, tech stack, MVP, and milestones, and I now teach full-stack fundamentals while managing scope, clearing roadblocks, and turning feedback from industry professionals into technical and product decisions.',
      bullets: [
        'Authored a comprehensive feasibility report defining the system architecture, tech stack, MVP, stretch goals, and weekly milestones for Echo, an AI-narrated audiobook mobile app, before program kickoff',
        'Lead a team of 4 undergraduate developers through 5 two-week Agile sprints over a 10-week program, teaching full-stack fundamentals while managing scope and timeline',
        "Translate feedback from industry professionals into actionable technical and product decisions, aligning the project's direction with real-world engineering practices",
        'Identify and mitigate roadblocks across weekly sprint milestones to keep the team on track toward on-time completion',
      ],
    },
    skills: ['Leadership', 'Agile', 'System Architecture', 'Mentorship', 'React Native', 'FastAPI'],
    // Add `video: '<url>'` once the presentation is recorded.
    links: { source: 'https://github.com/acm-projects/Echo' },
  },
  {
    id: 'wink',
    role: 'Software Engineering Intern',
    org: 'Wink',
    logo: { src: winkLogo, alt: 'Wink logo', background: 'light' },
    period: { start: '2026-01', end: '2026-08' },
    description: {
      sentence:
        "Integrated Wink's biometric payment SDK into native Android apps on point-of-sale registers and kiosks through secure end-to-end communications.",
      paragraph:
        "Built a Kotlin Android app that wirelessly links point-of-sale registers to Wink's biometric payment SDK, authenticating in under 800ms. I migrated the codebase from Flutter to native Kotlin, cutting RAM usage by 50%, unified Wi-Fi, Bluetooth RFCOMM, and USB links behind one transport-agnostic interface, and secured pairing with mutual TLS and hardware-backed keys.",
      bullets: [
        'Built a Kotlin/Android app wirelessly linking POS registers to the biometric SDK, authenticating under 800ms',
        'Optimized performance by migrating the codebase from Flutter to native Kotlin, cutting RAM usage by 50%',
        'Unified Wi-Fi, Bluetooth RFCOMM, and USB register-terminal links behind one transport-agnostic interface',
        'Secured pairing with mutual TLS and hardware-backed keys, replacing 64-char fingerprints with an 8-digit code',
      ],
    },
    skills: ['Kotlin', 'Android', 'Mutual TLS', 'Bluetooth', 'Figma', 'Node.js', 'Azure', 'JUnit'],
    links: {},
  },
  {
    id: 'acm-development-officer',
    role: 'Development Officer',
    org: 'ACM UTD',
    orgUrl: 'https://www.acmutd.co',
    logo: { src: acmDevelopmentLogo, alt: 'ACM Development logo', background: 'dark' },
    period: { start: '2025-12', end: 'present' },
    description: {
      sentence:
        'Building and maintaining the services and tools provided by ACM UTD, the largest student organization on campus.',
      paragraph:
        'Building and maintaining the services and tools provided by ACM UTD, the largest student organization on campus. I built Go REST endpoints serving UTD coursebook, grade, and professor data from Firestore, deployed the API on AWS EC2 and Cloudflare with Google OAuth login and API key management, and fixed a 4-year-old bug in utdgrades.com that dropped all F grades.',
      bullets: [
        'Built REST endpoints in Golang serving UTD coursebook, grade, and professor data from Firebase Firestore',
        'Deployed the API on AWS EC2 and Cloudflare, architecting Google OAuth login and API key management',
        "Fixed a 4-year-old bug in ACM's utdgrades.com that dropped all F grades, skewing class sizes and averages",
        'Built section sorting/filtering by mean GPA and median grade in React, queried in-browser over SQLite via sql.js',
      ],
    },
    skills: ['Go', 'REST', 'Firebase Firestore', 'GCP', 'AWS EC2', 'Cloudflare', 'Docker', 'OAuth'],
    links: {},
  },
]
