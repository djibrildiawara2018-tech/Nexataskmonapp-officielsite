import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  return <RegisterForm refCode={sp.ref} />;
}
