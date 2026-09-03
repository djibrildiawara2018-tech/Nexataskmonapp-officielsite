import { ResetPasswordForm } from "@/components/auth-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <ResetPasswordForm token={sp.token ?? ""} />;
}
