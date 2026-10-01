import React from 'react';

/**
 * Root error boundary.
 *
 * Without this, any render-time throw unmounts the whole tree and React 19
 * replaces it with a blank page — the user loses the chat, the wizard and the
 * language selection with no way back. A medical app showing a white screen to
 * someone who may be mid-triage is the worst failure mode available, so the
 * boundary offers a reload and a way back to the dashboard.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
        <div className="glass-strong max-w-md rounded-ui-xl p-8 text-center">
          <h1 className="text-xl font-black tracking-tight">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-ink-muted">
            L&apos;application a rencontré un problème inattendu. Vos données médicales
            n&apos;ont pas été affectées.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="brand-gradient rounded-full px-6 py-3 text-sm font-black text-white"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="glass rounded-full px-6 py-3 text-sm font-black text-ink"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
