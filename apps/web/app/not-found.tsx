import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <p className="mb-4 text-6xl">🌳</p>
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-600">
          404
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          The link may have moved or never existed. Try heading back home.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
