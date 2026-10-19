// The shape of everything the portfolio knows about Allen.
// Every theme renders from a `Portfolio` object, so this file is the contract between
// the content in src/data and the designs in src/themes.

type Month = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'

/** A calendar month, e.g. "2026-01". */
export type YearMonth = `${number}-${Month}`

export interface Period {
  start: YearMonth
  /** Omit for single-month events; "present" for ongoing ones. */
  end?: YearMonth | 'present'
}

export interface Image {
  /** Bundled image URL (import the file from src/assets so it gets a cache-busting hash). */
  src: string
  alt: string
}

export interface Logo extends Image {
  /** Background the logo is designed for: "dark" for logos with white parts. */
  background: 'light' | 'dark'
}

export interface Photo extends Image {
  caption?: string
  /** CSS object-position used when the photo is cropped, e.g. "85% 50%" to keep the face in frame. */
  focus?: string
}

/** Outbound links for an experience or project. Themes decide how to label and order them. */
export interface Links {
  /** The live site or app. */
  live?: string
  /** Source code repository. */
  source?: string
  /** Hackathon demo page (e.g. Devpost). */
  demo?: string
  /** Recorded presentation or demo video. */
  video?: string
  /** A write-up or social post about it. */
  post?: string
}

export interface Fact {
  label: string
  value: string
}

export interface Profile {
  name: string
  headline: string
  /** One-sentence pitch shown under the name. */
  tagline: string
  location: string
  photo: Photo
  /** Bio paragraphs, in order. */
  bio: string[]
  /** Short at-a-glance facts shown beside the bio. */
  facts: Fact[]
  email: string
  github: string
  linkedin: string
  /** Path to the one-page resume served from /public. */
  resumeUrl: string
}

export interface Experience {
  id: string
  role: string
  org: string
  orgUrl?: string
  logo?: Logo
  period: Period
  /** One or two sentences. */
  description: string
  skills: string[]
  links: Links
}

export interface Project {
  id: string
  title: string
  /** One or two sentences. */
  description: string
  period: Period
  /** What Allen did on the project, when it isn't obvious (e.g. "Founder & sole developer"). */
  role?: string
  /** Competition result, e.g. "HackAI 2026 — Track Winner". */
  award?: string
  stack: string[]
  links: Links
}

export interface Portfolio {
  profile: Profile
  experience: Experience[]
  projects: Project[]
}
