import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every /admin/* route runs this before rendering anything below it.
  await requireAdmin();

  return (
    <div>
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Admin console — actions here are attributed and written to the public mishrin ledger.
      </div>
      {children}
    </div>
  );
}
