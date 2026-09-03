"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  setupAdminAction,
  type ActionState,
} from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Alert, Field, Input } from "./ui";
import { ActionAlert, SubmitButton } from "./client";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("auth.login.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("auth.login.subtitle")}</p>
      </div>
      {initialError === "disabled" && !state && <Alert tone="error">{t("auth.err.accountDisabled")}</Alert>}
      <ActionAlert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("auth.email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Field label={t("auth.password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right -mt-2">
        <Link href="/forgot-password" className="text-sm font-medium text-emerald-700">
          {t("auth.forgotPassword")}
        </Link>
      </div>
      <SubmitButton size="lg" className="w-full">
        {t("auth.loginButton")}
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-emerald-700">
          {t("auth.register.title")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ refCode }: { refCode?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(registerAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("auth.register.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("auth.register.subtitle")}</p>
      </div>
      <ActionAlert state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.firstName")} htmlFor="firstName">
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </Field>
        <Field label={t("auth.lastName")} htmlFor="lastName">
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </Field>
      </div>
      <Field label={t("auth.phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+225 07 00 00 00 00" required />
      </Field>
      <Field label={t("auth.email")} htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </Field>
      <Field label={t("auth.password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label={t("auth.confirmPassword")} htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label={`${t("auth.referralCode")} (${t("common.optional")})`} htmlFor="referralCode">
        <Input id="referralCode" name="referralCode" defaultValue={refCode ?? ""} className="uppercase" placeholder="NXABC123" />
      </Field>
      <p className="text-xs text-slate-500">{t("auth.terms")}</p>
      <SubmitButton size="lg" className="w-full">
        {t("auth.registerButton")}
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-emerald-700">
          {t("auth.loginButton")}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("auth.forgot.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("auth.forgot.subtitle")}</p>
      </div>
      <ActionAlert state={state} />
      {state?.data?.link && (
        <Alert tone="warning">
          <p className="font-semibold">{t("auth.forgot.demoLink")}</p>
          <a href={state.data.link} className="underline break-all text-emerald-800">
            {state.data.link}
          </a>
        </Alert>
      )}
      <Field label={t("auth.email")} htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {t("auth.forgot.button")}
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-emerald-700">
          ← {t("auth.loginButton")}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-2xl font-extrabold text-slate-900">{t("auth.reset.title")}</h1>
      <ActionAlert state={state} />
      <input type="hidden" name="token" value={token} />
      {state?.success ? (
        <Link href="/login" className="block text-center font-semibold text-emerald-700">
          {t("auth.loginButton")} →
        </Link>
      ) : (
        <>
          <Field label={t("me.newPassword")} htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label={t("auth.confirmPassword")} htmlFor="confirmPassword">
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <SubmitButton size="lg" className="w-full">
            {t("auth.reset.button")}
          </SubmitButton>
        </>
      )}
    </form>
  );
}

export function SetupAdminForm() {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(setupAdminAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("setup.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("setup.subtitle")}</p>
      </div>
      <ActionAlert state={state} />
      <Field label={t("auth.email")} htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label={t("setup.secret")} htmlFor="secret">
        <Input id="secret" name="secret" type="password" autoComplete="off" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {t("setup.button")}
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-emerald-700">
          ← {t("auth.loginButton")}
        </Link>
      </p>
    </form>
  );
}
