'use client';

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-luxury-950 flex flex-col items-center justify-center p-6 text-center select-none z-50 relative">
          <div className="glass-panel max-w-md p-8 border border-white/10 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-brand-secondary/15 flex items-center justify-center text-brand-secondary">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">System Error</h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                An unexpected rendering issue has occurred. The portal session has been safely isolated.
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-brand-primary hover:bg-opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" /> Reset Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
