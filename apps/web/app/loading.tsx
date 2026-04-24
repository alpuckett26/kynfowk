export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-warm-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-brand-200" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}
