"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell">
      <div className="container panel-shell">
        <div className="card stack-md">
          <span className="eyebrow">Something went wrong</span>
          <h1>We hit a snag loading Kynfowk.</h1>
          <p className="lede">
            {error.message ||
              "Please try again. If the issue keeps happening, check your environment variables and Supabase connection."}
          </p>
          <button className="button" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
