import Link from "next/link";
import { Clapperboard, CreditCard, LayoutDashboard, Shield, Upload } from "lucide-react";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/settings", label: "Billing", icon: CreditCard }
];

export function AppShell({ children, session }: { children: React.ReactNode; session: Session }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/60 px-4 py-5 backdrop-blur lg:block">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 text-lg font-semibold">
          <Clapperboard className="h-5 w-5 text-primary" />
          ClipForge
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="w-full justify-start">
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
          {session.user.role === "ADMIN" ? (
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/admin/jobs">
                <Shield className="mr-2 h-4 w-4" />
                Admin jobs
              </Link>
            </Button>
          ) : null}
        </nav>
        <div className="absolute bottom-5 left-4 right-4">
          <div className="mb-3 rounded-lg border border-border bg-background p-3 text-sm">
            <p className="font-medium">{session.user.name ?? "Creator"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Clapperboard className="h-5 w-5 text-primary" />
            ClipForge
          </Link>
          <Button asChild size="sm">
            <Link href="/upload">Upload</Link>
          </Button>
        </div>
      </header>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
