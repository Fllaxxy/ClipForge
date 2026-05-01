import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="clipforge-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(20,184,166,0.2),transparent_36%)]" />
      <div className="relative w-full max-w-md">
        <AuthForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Back to landing
          </Link>
        </p>
      </div>
    </main>
  );
}
