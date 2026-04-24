import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">💜</span>
          <span>Kynfowk</span>
        </div>
        <p className="text-center text-sm text-gray-500">
          Built with love for families everywhere. &copy;{" "}
          {new Date().getFullYear()} Kynfowk
        </p>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link
            href="/case-studies"
            className="transition-colors hover:text-gray-700"
          >
            Stories
          </Link>
          <Link
            href="/dashboard"
            className="transition-colors hover:text-gray-700"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
