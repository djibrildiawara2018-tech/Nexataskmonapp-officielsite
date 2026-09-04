"use client";

import { useActionState } from "react";
import { saveProductAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { ActionAlert, ImageUploader, SubmitButton } from "@/components/client";
import { Card, CardBody, Field, Input, Textarea } from "@/components/ui";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  dailyBonus: number;
  durationDays: number;
  sortOrder: number;
  isActive: boolean;
};

export function ProductForm({ product }: { product?: ProductFormValues }) {
  const { t } = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(saveProductAction, null);
  return (
    <Card>
      <CardBody>
        <form action={action} className="space-y-4">
          <ActionAlert state={state} />
          {product?.id && <input type="hidden" name="id" value={product.id} />}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.products.name")} htmlFor="name"><Input id="name" name="name" defaultValue={product?.name} required /></Field>
            <Field label={t("admin.products.slug")} htmlFor="slug"><Input id="slug" name="slug" defaultValue={product?.slug} placeholder="nexa-start" /></Field>
            <Field label={t("admin.products.price")} htmlFor="price"><Input id="price" name="price" type="number" inputMode="numeric" min={1} step={1} defaultValue={product?.price} required /></Field>
            <Field label={t("admin.products.dailyBonus")} htmlFor="dailyBonus"><Input id="dailyBonus" name="dailyBonus" type="number" inputMode="numeric" min={0} step={1} defaultValue={product?.dailyBonus} required /></Field>
            <Field label={t("admin.products.duration")} htmlFor="durationDays"><Input id="durationDays" name="durationDays" type="number" inputMode="numeric" min={1} step={1} defaultValue={product?.durationDays ?? 180} required /></Field>
            <Field label={t("admin.products.sortOrder")} htmlFor="sortOrder"><Input id="sortOrder" name="sortOrder" type="number" inputMode="numeric" step={1} defaultValue={product?.sortOrder ?? 0} /></Field>
          </div>
          <ImageUploader name="imageUrl" defaultValue={product?.imageUrl} label={t("admin.products.imageUrl")} />
          <Field label={t("common.description")} htmlFor="description"><Textarea id="description" name="description" defaultValue={product?.description ?? ""} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="w-4 h-4 accent-emerald-600" /> {t("admin.products.active")}
          </label>
          <SubmitButton size="lg" className="w-full sm:w-auto">{t("common.save")}</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
