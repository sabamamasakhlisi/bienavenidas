/**
 * The sign-up form's state.
 *
 * Its own module because `actions.ts` carries `"use server"`, and such a file
 * may export nothing but async functions — everything it exports becomes a
 * callable server endpoint, so a plain constant is a runtime error rather than
 * a type error. It fails only when the form is actually submitted, which is
 * exactly when nobody is watching the console.
 */
export type SubscribeState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; reason: "email" | "throttled" | "failed" };

export const initialSubscribeState: SubscribeState = { status: "idle" };
