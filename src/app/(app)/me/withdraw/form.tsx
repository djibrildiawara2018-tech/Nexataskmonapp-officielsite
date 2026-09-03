"use client";

import { useActionState, useState } from "react";
import { requestWithdrawalAction } from "@/lib/actions/user";
import type { ActionState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { ActionAlert, SubmitButton } from "@/components/client";
import { Field, Input, Select } from "@/components/ui";

export function WithdrawForm({ available, availableLabel, minAmount, minLabel, defaultPhone }: { available: number; availableLabel: string; minAmount: number; minLabel: string; defaultPhone: string }) {
  const { t, money } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(requestWithdrawalAction, null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const canSubmit = available >= minAmount;
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        const n = Number(amount);
        if (!window.confirm(t("withdraw.confirm", { amount: money(n), phone }))) e.preventDefault();
      }}
    >
      <ActionAlert state={state?.error === "withdraw.err.min" ? { error: undefined, success: undefined } : state} />
      {state?.error === "withdraw.err.min" && <p className="text-sm text-rose-600">{t("withdraw.err.min", { amount: minLabel })}</p>}
      <Field label={t("withdraw.amount")} htmlFor="amount" hint={`${t("withdraw.min", { amount: minLabel })} · ${t("withdraw.available", { amount: availableLabel })}`}>
        <Input id="amount" name="amount" type="number" inputMode="numeric" min={minAmount} max={available} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label={t("withdraw.method")} htmlFor="method">
        <Select id="method" name="method" defaultValue="wave" required>
          <option value="wave">{t("method.wave")}</option>
          <option value="orange_money">{t("method.orange_money")}</option>
          <option value="mtn_momo">{t("method.mtn_momo")}</option>
          <option value="moov_money">{t("method.moov_money")}</option>
        </Select>
      </Field>
      <Field label={t("withdraw.phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </Field>
      <SubmitButton size="lg" className="w-full" disabled={!canSubmit}>
        {t("withdraw.submit")}
      </SubmitButton>
    </form>
  );
}
