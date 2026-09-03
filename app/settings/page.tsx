import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ManagebacForm } from "@/components/ManagebacForm";

export default async function Settings() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← Back
      </Link>
      <h1 className="mb-8 mt-4 text-xl font-semibold">Settings</h1>
      <ManagebacForm />
    </main>
  );
}
