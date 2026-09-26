"use server";

import { headers } from "next/headers";

import { getLocale } from "next-intl/server";

import { defaultLocale, isLocale } from "@/i18n/config";

import type { SubscribeState } from "./state";
import { addSubscriber } from "./subscribers";

/**
 * Deliberately loose. Anything stricter rejects real addresses — the only test
 * that settles whether an address works is sending to it, and the database's
 * own check already refuses anything without an @ and a dot.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Longest address anyone has any business typing. */
const MAX_LENGTH = 254;

/**
 * A brake on scripted sign-ups, sized not to catch real ones.
 *
 * Callers are identified by IP, and an IP is not a person: a household, an
 * office, a whole mobile carrier behind NAT all arrive as one. So this allows
 * a handful in a window rather than one — enough that a family, a book launch
 * and a shared office never notice it, few enough that a script filling the
 * table has to work at it.
 *
 * Module scope, so it resets on deploy and counts per instance. That is what
 * it is: a brake, not a defence. The real protections are the honeypot, the
 * shape check, and the primary key that makes a repeat an upsert.
 *
 * Only accepted sign-ups are counted, so a mistyped address never uses up
 * someone's allowance.
 */
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 5;
const accepted = new Map<string, number[]>();

function recent(caller: string) {
  const cutoff = Date.now() - WINDOW_MS;
  return (accepted.get(caller) ?? []).filter((at) => at > cutoff);
}

function tooMany(caller: string) {
  return recent(caller).length >= PER_WINDOW;
}

function remember(caller: string) {
  accepted.set(caller, [...recent(caller), Date.now()]);

  // Unbounded growth would be a slow leak on a long-lived instance.
  if (accepted.size > 5000) {
    for (const [key] of accepted) {
      if (recent(key).length === 0) accepted.delete(key);
    }
  }
}

async function callerId() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

/**
 * Takes a newsletter sign-up from the contact page.
 *
 * Public and unauthenticated, so it assumes bad faith: a honeypot field no
 * real person can fill, a length cap, a shape check, and a per-caller brake.
 *
 * An address already on the list is answered exactly like a new one. Saying
 * "you are already subscribed" would turn this form into a way to ask whether
 * a given person reads BIEN*VENIDAS, which is not ours to answer.
 */
export async function subscribe(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  // Hidden in the form and off-screen; a submission that fills it is a bot.
  // Answered with success so it has nothing to learn from being refused.
  if (formData.get("website")) return { status: "success" };

  const email = String(formData.get("email") ?? "").trim();

  if (email.length > MAX_LENGTH || !LOOKS_LIKE_EMAIL.test(email)) {
    return { status: "error", reason: "email" };
  }

  const caller = await callerId();
  if (tooMany(caller)) return { status: "error", reason: "throttled" };

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const outcome = await addSubscriber(email, locale);

  if (outcome === "failed" || outcome === "unconfigured") {
    return { status: "error", reason: "failed" };
  }

  remember(caller);
  return { status: "success" };
}
