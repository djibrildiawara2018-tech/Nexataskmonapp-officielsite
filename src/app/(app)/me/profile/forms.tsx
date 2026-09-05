"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type ActionState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { ActionAlert, SubmitButton } from "@/components/client";
import { Card, CardBody, Field, Input } from "@/components/ui";

export function ProfileForms({ user }: { user: { firstName: string; lastName: string; phone: string; email: string; wavePhone: string | null } }) {
  const { t } = useI18n();
  const [pState, pAction] = useActionState<ActionState, FormData>(updateProfileAction, null);
  const [sState, sAction] = useActionState<ActionState, FormData>(changePasswordAction, null);
  return (
    <>
      <Card>
        <CardBody>
          <h1 className="text-lg font-extrabold mb-4">{t("me.editProfile")}</h1>
          <form action={pAction} className="space-y-4">
            <ActionAlert state={pState} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("auth.firstName")} htmlFor="firstName">
                <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
              </Field>
              <Field label={t("auth.lastName")} htmlFor="lastName">
                <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
              </Field>
            </div>
            <Field label={t("auth.phone")} htmlFor="phone">
              <Input id="phone" name="phone" type="tel" defaultValue={user.phone} required />
            </Field>
            <Field label="Numéro Wave (retrait)" htmlFor="wavePhone" hint="Utilisé pour recevoir vos retraits">
              <Input id="wavePhone" name="wavePhone" type="tel" defaultValue={user.wavePhone ?? ""} placeholder="+2250102030405" />
            </Field>
            <Field label={t("auth.email")} htmlFor="email">
              <Input id="email" value={user.email} disabled readOnly />
            </Field>
            <SubmitButton className="w-full">{t("common.save")}</SubmitButton>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="text-lg font-extrabold mb-4">{t("me.changePassword")}</h2>
          <form action={sAction} className="space-y-4">
            <ActionAlert state={sState} />
            <Field label={t("me.currentPassword")} htmlFor="currentPassword">
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label={t("me.newPassword")} htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label={t("auth.confirmPassword")} htmlFor="confirmPassword">
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <SubmitButton variant="secondary" className="w-full">
              {t("me.changePassword")}
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
