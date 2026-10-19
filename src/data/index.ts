import { experience } from './experience'
import { profile } from './profile'
import { projects } from './projects'
import type { Portfolio } from './schema'

export const portfolio: Portfolio = {
  profile,
  experience,
  projects,
}

export type * from './schema'
