import type { MotifKind } from './model'

// Presentation only: which painted scene stands for a project. The only place ids appear here.
const MOTIFS: Readonly<Record<string, MotifKind>> = {
  'toe-to-toe': 'duel',
  'headless-sports': 'sport',
  'open-team-sheets': 'team',
  'utd-grades': 'grades',
  docbranch: 'branch',
}

export function motifFor(projectId: string): MotifKind {
  return (Object.hasOwn(MOTIFS, projectId) && MOTIFS[projectId]) || 'lamp'
}
