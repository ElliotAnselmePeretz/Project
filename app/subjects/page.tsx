import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubjectSelection } from "@/components/SubjectSelection";

export default async function Subjects() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← Back
      </Link>
      <h1 className="mb-8 mt-4 text-xl font-semibold">Subjects</h1>
      <SubjectSelection />
    </main>
  );
}
