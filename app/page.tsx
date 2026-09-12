import Link from "next/link";
import { getServerDictionary } from "@/lib/i18n/server";

export default function HomePage() {
  const { dict } = getServerDictionary();

  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
        Sahayata
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-neutral-600">{dict.home.subtitle}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/dashboard" className="btn-primary">
          {dict.home.viewRequests}
        </Link>
        <Link href="/requests/new" className="btn-secondary">
          {dict.home.requestSupport}
        </Link>
      </div>
    </div>
  );
}
