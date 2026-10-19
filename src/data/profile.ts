import photo from '../assets/allen.jpg'
import type { Profile } from './schema'

export const profile: Profile = {
  name: 'Allen Zheng',
  headline: 'Software Engineer',
  tagline: 'I build things to solve problems.',
  location: 'Dallas, TX',
  // Placeholder until a professional headshot replaces src/assets/allen.jpg.
  photo: {
    src: photo,
    alt: 'Allen Zheng smiling at sunset above Florence, Italy',
    caption: 'Florence, Italy',
    focus: '85% 50%',
  },
  bio: [
    "I'm a computer science student at The University of Texas at Dallas (Class of 2028), a National Merit Scholar, and part of the Computing Scholars and Hobson Wildenthal honors programs.",
    "Most recently I was a software engineering intern at Wink, where I built a native Android app that links point-of-sale registers to Wink's biometric payment SDK. On campus I'm a Development Officer and Project Manager for ACM UTD, and I've also founded Open Team Sheets, an open-source search engine for competitive Pokémon teams.",
    "Besides all that, I'm a big fan of rock climbing, gymnastics, cooking, chess, traveling, and studying Chinese and Japanese.",
  ],
  facts: [
    { label: 'Based in', value: 'Dallas, TX' },
    { label: 'Studying', value: 'B.S. Computer Science, UT Dallas' },
  ],
  email: 'hello@allenzheng.com',
  github: 'https://github.com/AllenZheng-05',
  linkedin: 'https://www.linkedin.com/in/allen-zheng05/',
  resumeUrl: '/resume.pdf',
}
