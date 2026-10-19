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
    description:
      'Lead a team of four undergraduate developers building Echo, a fully-produced character-voiced audiobook mobile app.',
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
    description:
      "Integrated Wink's biometric payment SDK into native Android apps on point-of-sale registers and kiosks through secure end-to-end communications.",
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
    description:
      'Building and maintaining the services and tools provided by ACM UTD, the largest student organization on campus.',
    skills: ['Go', 'REST', 'Firebase Firestore', 'GCP', 'AWS EC2', 'Cloudflare', 'Docker', 'OAuth'],
    links: {},
  },
]
