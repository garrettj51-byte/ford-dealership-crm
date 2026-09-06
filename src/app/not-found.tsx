import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Lead not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been removed, or the link is wrong.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[var(--ford-navy)] px-4 text-sm font-medium text-white"
      >
        Back to Today
      </Link>
    </div>
  );
}
