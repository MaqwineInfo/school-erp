/**
 * The six cross-cutting system states (wireframes WF-0275 … WF-0281).
 *
 * These existed nowhere, so every page invented its own empty/error handling — and an
 * unauthorised route simply redirected to the dashboard, which reads as "the link is
 * broken" rather than "you do not have access".
 */
import React from 'react';
import { Link } from 'react-router-dom';

interface StateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

function Shell({ icon, tone, title, message, action }: StateProps & { icon: string; tone: string }) {
  return (
    <div className="flex items-center justify-center min-h-[420px] p-6">
      <div className="text-center max-w-md">
        <div
          className={`w-16 h-16 ${tone} rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl`}
        >
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {message && <p className="text-gray-500 text-sm mt-2 leading-relaxed">{message}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

/** WF-0275 */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[420px]" role="status" aria-live="polite">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm mt-3">{label}</p>
      </div>
    </div>
  );
}

/** WF-0276 — nothing exists yet. */
export function EmptyState({ title = 'Nothing here yet', message, action }: StateProps) {
  return <Shell icon="📭" tone="bg-gray-100" title={title} message={message} action={action} />;
}

/** WF-0277 — records exist, but none match the current filters. */
export function NoResultsState({ onClear }: { onClear?: () => void }) {
  return (
    <Shell
      icon="🔍"
      tone="bg-gray-100"
      title="No matching records"
      message="Nothing matches the filters you have applied."
      action={
        onClear && (
          <button type="button" onClick={onClear} className="text-blue-600 text-sm font-medium hover:underline">
            Clear filters
          </button>
        )
      }
    />
  );
}

/** WF-0278 */
export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const message =
    (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
    (error as Error)?.message ??
    'Something went wrong. Please try again.';

  return (
    <Shell
      icon="⚠️"
      tone="bg-red-50"
      title="Could not load this page"
      message={message}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
        )
      }
    />
  );
}

/**
 * WF-0280 — permission denied.
 * Explains WHY rather than bouncing the user to the dashboard.
 */
export function ForbiddenState({ module, action }: { module?: string; action?: string }) {
  const what = module ? module.replace(/_/g, ' ') : 'this page';
  return (
    <Shell
      icon="🔒"
      tone="bg-amber-50"
      title="You do not have access"
      message={
        action && action !== 'view'
          ? `Your role does not allow you to ${action} ${what}. Ask your administrator if you need it.`
          : `Your role does not include access to ${what}. Ask your administrator if you need it.`
      }
      action={
        <Link to="/" className="text-blue-600 text-sm font-medium hover:underline">
          Back to dashboard
        </Link>
      }
    />
  );
}

/**
 * WF-0281 — the tenant's plan excludes this module.
 * Deliberately distinct from ForbiddenState: "your school has not enabled this" is not
 * "you are not allowed", and the API returns a different code for exactly this reason.
 */
export function ModuleDisabledState({ module }: { module?: string }) {
  const what = module ? module.replace(/_/g, ' ') : 'This module';
  return (
    <Shell
      icon="🧩"
      tone="bg-indigo-50"
      title={`${what.charAt(0).toUpperCase()}${what.slice(1)} is not enabled`}
      message="This module is not part of your school's current plan. Contact your administrator to enable it."
      action={
        <Link to="/" className="text-blue-600 text-sm font-medium hover:underline">
          Back to dashboard
        </Link>
      }
    />
  );
}

/** WF-0282 */
export function OfflineState() {
  return (
    <Shell
      icon="📡"
      tone="bg-gray-100"
      title="You are offline"
      message="Check your connection. Any attendance or homework you entered will sync automatically."
    />
  );
}
