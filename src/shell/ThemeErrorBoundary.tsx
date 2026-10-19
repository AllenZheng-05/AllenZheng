import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Catches a theme that fails to load or render — most often a stale code-split chunk right
 * after a new deploy — and offers a reload instead of a blank page.
 */
export class ThemeErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center bg-white p-6 font-sans text-zinc-900">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Something went wrong loading this page.</h1>
          <p className="mt-2 text-zinc-600">
            The site may have just been updated. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white"
          >
            Reload
          </button>
        </div>
      </main>
    )
  }
}
