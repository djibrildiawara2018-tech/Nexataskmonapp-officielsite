"use client";

import { useActionState, useState } from "react";
import { requestWithdrawalAction } from "@/lib/actions/user";
import type { ActionState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { ActionAlert, SubmitButton } from "@/components/client";
import { Field, Input, Select } from "@/components/ui";

export function WithdrawForm({ available, availableLabel, minAmount, minLabel, wavePhone }: { available: number; availableLabel: string; minAmount: number; minLabel: string; wavePhone: string | null }) {
  const { t, money } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(requestWithdrawalAction, null);
  const [amount, setAmount] = useState("");
  const canSubmit = available >= minAmount && !!wavePhone;
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        const n = Number(amount);
        if (!window.confirm(t("withdraw.confirm", { amount: money(n), phone: wavePhone ?? "" }))) e.preventDefault();
      }}
    >
      <ActionAlert state={state?.error === "withdraw.err.min" ? { error: undefined, success: undefined } : state} />
      {state?.error === "withdraw.err.min" && <p className="text-sm text-rose-600">{t("withdraw.err.min", { amount: minLabel })}</p>}
      <Field label={t("withdraw.amount")} htmlFor="amount" hint={`${t("withdraw.min", { amount: minLabel })} · ${t("withdraw.available", { amount: availableLabel })}`}>
        <Input id="amount" name="amount" type="number" inputMode="numeric" min={minAmount} max={available} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
        <input type="hidden" name="method" value="wave" />
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">W</span>
        Retrait via Wave
      </div>
        {wavePhone ? (
          <Field label="Numéro Wave" htmlFor="phone" hint="Le retrait sera envoyé sur ce numéro Wave">
            <input type="hidden" name="phone" value={wavePhone} />
            <Input id="phone" type="tel" value={wavePhone} disabled readOnly />
          </Field>
        ) : (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            Aucun numéro Wave enregistré.{" "}
            <a href="/me/profile" className="font-semibold underline">Ajoutez-le dans votre profil</a>{" "}
            avant de demander un retrait.
          </div>
        )}
      <SubmitButton size="lg" className="w-full" disabled={!canSubmit}>
        {t("withdraw.submit")}
      </SubmitButton>
    </form>
  );
}
