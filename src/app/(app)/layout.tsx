import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <AppShell session={session}>{children}</AppShell>;
}
