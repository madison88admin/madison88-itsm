import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Frontend render error", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen" role="alert">
          <h1>Something went wrong</h1>
          <p>Refresh the page and try again. If the problem continues, contact IT Support.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn primary">
            Refresh application
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
