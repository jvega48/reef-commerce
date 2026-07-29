"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import {
  guaranteeSettingsSchema,
  saveSettingsGroup,
  shippingSettingsSchema,
  storeInfoSettingsSchema,
  taxSettingsSchema,
} from "./settings";

const SETTINGS_ROLES: Role[] = ["OWNER", "ADMIN"];

const num = (fd: FormData, key: string) => Number(fd.get(key) ?? NaN);
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
// Comma/space/newline separated list → trimmed non-empty strings.
const list = (fd: FormData, key: string) =>
  String(fd.get(key) ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const intList = (fd: FormData, key: string) =>
  list(fd, key)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n));

export async function saveSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user || !SETTINGS_ROLES.includes(session.user.role)) {
    redirect("/admin");
  }

  const shipping = shippingSettingsSchema.safeParse({
    freeShippingThreshold: num(formData, "freeShippingThreshold"),
    overnightRate: num(formData, "overnightRate"),
    inStateRate: num(formData, "inStateRate"),
    homeState: str(formData, "homeState").toUpperCase(),
    maxBoxWeightLbs: num(formData, "maxBoxWeightLbs"),
    shipDaysNote: str(formData, "shipDaysNote"),
    overnightLabel: str(formData, "overnightLabel"),
    overnightDescription: str(formData, "overnightDescription"),
    localPickupEnabled: formData.get("localPickupEnabled") === "on",
    allowedStatesNote: str(formData, "allowedStatesNote"),
    shipDays: intList(formData, "shipDays"),
    blackoutDates: list(formData, "blackoutDates"),
    holidayScheduleNote: str(formData, "holidayScheduleNote"),
    excludedStates: list(formData, "excludedStates").map((s) => s.toUpperCase()),
    autoGenerateLabel: formData.get("autoGenerateLabel") === "on",
    useLiveRates: formData.get("useLiveRates") === "on",
    defaultServiceToken: str(formData, "defaultServiceToken"),
    defaultCarrier: str(formData, "defaultCarrier"),
    shipFromName: str(formData, "shipFromName"),
    shipFromCompany: str(formData, "shipFromCompany"),
    shipFromStreet1: str(formData, "shipFromStreet1"),
    shipFromStreet2: str(formData, "shipFromStreet2"),
    shipFromCity: str(formData, "shipFromCity"),
    shipFromState: str(formData, "shipFromState").toUpperCase(),
    shipFromZip: str(formData, "shipFromZip"),
    shipFromCountry: str(formData, "shipFromCountry").toUpperCase() || "US",
    shipFromPhone: str(formData, "shipFromPhone"),
    shipFromEmail: str(formData, "shipFromEmail"),
    parcelLengthIn: num(formData, "parcelLengthIn"),
    parcelWidthIn: num(formData, "parcelWidthIn"),
    parcelHeightIn: num(formData, "parcelHeightIn"),
    parcelTareOz: num(formData, "parcelTareOz"),
  });

  const storeInfo = storeInfoSettingsSchema.safeParse({
    phone: str(formData, "phone"),
    hoursWeekday: str(formData, "hoursWeekday"),
    hoursWeekend: str(formData, "hoursWeekend"),
    instagram: str(formData, "instagram"),
    tiktok: str(formData, "tiktok"),
    supportEmail: str(formData, "supportEmail"),
  });

  const guarantee = guaranteeSettingsSchema.safeParse({
    guaranteeDays: num(formData, "guaranteeDays"),
    reportWindowDays: num(formData, "reportWindowDays"),
    doaVideoWindowHours: num(formData, "doaVideoWindowHours"),
    highValueVideoThreshold: num(formData, "highValueVideoThreshold"),
    cancellationFeePct: num(formData, "cancellationFeePct"),
    coralHoldDays: num(formData, "coralHoldDays"),
    fishHoldBusinessDays: num(formData, "fishHoldBusinessDays"),
  });

  const tax = taxSettingsSchema.safeParse({
    enabled: formData.get("taxEnabled") === "on",
    ratePct: num(formData, "taxRatePct"),
    homeStateOnly: formData.get("taxHomeStateOnly") === "on",
    taxShipping: formData.get("taxShipping") === "on",
    label: str(formData, "taxLabel") || "Sales tax",
  });

  if (!shipping.success || !storeInfo.success || !guarantee.success || !tax.success) {
    redirect("/admin/settings?error=1");
  }

  await saveSettingsGroup("shipping", shipping.data);
  await saveSettingsGroup("storeInfo", storeInfo.data);
  await saveSettingsGroup("guarantee", guarantee.data);
  await saveSettingsGroup("tax", tax.data);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "settings.update",
      entity: "StoreSetting",
      detail: { shipping: shipping.data, storeInfo: storeInfo.data, guarantee: guarantee.data, tax: tax.data },
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
