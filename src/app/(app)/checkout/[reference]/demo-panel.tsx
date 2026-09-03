"use client";

import { useActionState } from "react";
import { simulateDemoPaymentAction } from "@/lib/actions/user";
import type { ActionState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { ActionAlert, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody } from "@/components/ui";

export function DemoPaymentPanel({ reference, amountLabel }: { reference: string; amountLabel: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(simulateDemoPaymentAction, null);
  return (
    <Card className="border-amber-300">
      <div className="bg-amber-400 text-amber-950 text-xs font-bold text-center py-1.5 rounded-t-2xl">{t("common.demoMode")}</div>
      <CardBody className="space-y-3">
        <Alert tone="warning">{t("checkout.demoNotice")}</Alert>
        <ActionAlert state={state} />
        <form
          action={action}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          onSubmit={(e) => {
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.value === "success" && !window.confirm(t("checkout.confirmSimulate", { amount: amountLabel }))) e.preventDefault();
          }}
        >
          <input type="hidden" name="reference" value={reference} />
          <SubmitButton name="outcome" value="success" size="lg">
            {t("checkout.simulateSuccess")}
          </SubmitButton>
          <SubmitButton name="outcome" value="fail" variant="secondary" size="lg">
            {t("checkout.simulateFail")}
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
