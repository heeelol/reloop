import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}
interface State {
  hasError: boolean
}

// Contains render/effect errors in a subtree so one failing component
// (e.g. a map layer) can't take down the whole app.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary caught:', error)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="grid h-full w-full place-items-center bg-loop-50 p-6 text-center">
            <div>
              <p className="mb-2 text-sm font-semibold text-loop-800">
                Something went wrong here.
              </p>
              <button
                onClick={this.reset}
                className="rounded-full bg-loop-500 px-4 py-2 text-sm font-semibold text-white hover:bg-loop-600"
              >
                Try again
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
