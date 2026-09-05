import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { Icon } from "@/components/ui";
import { ProfileForms } from "./forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const { t } = await getT();
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link href="/me" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("me.title")}
      </Link>
      <ProfileForms user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email, wavePhone: user.wavePhone }} />
    </div>
  );
}
