import Link from "next/link";

/**
 * Shown when LiveKit env vars aren't configured (or the user is in
 * demo mode). Lets us preview the call surface without breaking.
 */
export function CallPlaceholder({ callId }: { callId: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4 text-white">
      <div className="max-w-md text-center">
        <p className="text-6xl">📞</p>
        <h1 className="mt-4 text-2xl font-bold">This is where the call happens</h1>
        <p className="mt-2 text-sm text-gray-300">
          Live video isn&apos;t configured yet. Once a LiveKit project is
          connected, members can join the room here.
        </p>
        <div className="mt-2 text-left rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-300">
          <p className="font-mono uppercase tracking-wider text-gray-400 text-[10px] mb-2">
            Required env vars
          </p>
          <ul className="space-y-1 font-mono">
            <li>NEXT_PUBLIC_LIVEKIT_URL</li>
            <li>LIVEKIT_API_KEY</li>
            <li>LIVEKIT_API_SECRET</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/post-call/${callId}`}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            End call (demo)
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
