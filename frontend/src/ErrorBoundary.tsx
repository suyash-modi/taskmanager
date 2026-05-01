import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected UI error" };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
          <h2>Something went wrong</h2>
          <p>The app crashed while rendering. Please refresh or login again.</p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#b91c1c" }}>{this.state.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

