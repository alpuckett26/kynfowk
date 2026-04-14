"use client";

export function GetStartedForm() {
  return (
    <form
      className="flex flex-col sm:flex-row gap-3 justify-center"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        placeholder="your@email.com"
        className="flex-1 rounded-full border border-gray-300 px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <button
        type="submit"
        className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-3.5 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
      >
        Create your family →
      </button>
    </form>
  );
}
