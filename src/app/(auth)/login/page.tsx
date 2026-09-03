import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  return <LoginForm next={sp.next} initialError={sp.error} />;
}
