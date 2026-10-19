import { Suspense } from 'react'
import { portfolio } from './data'
import { useTheme } from './shell/theme-context'
import { ThemeErrorBoundary } from './shell/ThemeErrorBoundary'

export function App() {
  const { theme } = useTheme()
  const Theme = theme.Component

  return (
    <ThemeErrorBoundary>
      <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
        <Theme data={portfolio} />
      </Suspense>
    </ThemeErrorBoundary>
  )
}
