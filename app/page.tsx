import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
        Sahayata
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-neutral-600">
        A community redistribution pool. Request support when you need it,
        contribute when you can — every request and allocation is logged to
        a public, tamper-evident ledger.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/dashboard" className="btn-primary">
          View active requests
        </Link>
        <Link href="/requests/new" className="btn-secondary">
          Request support
        </Link>
      </div>
    </div>
  );
}
