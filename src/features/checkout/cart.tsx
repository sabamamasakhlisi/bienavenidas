"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { Book, Currency } from "@/types/book";

import { MAX_QUANTITY } from "./limits";

export type CartLine = {
  slug: string;
  title: string;
  /**
   * Minor units, copied at add time for display only. Checkout re-prices every
   * line on the server from the catalogue, so a stale or edited value here can
   * never change what the customer is charged.
   */
  amount: number;
  currency: Currency;
  quantity: number;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  /** Total in minor units. Kept integer end to end — never round through floats. */
  total: number;
  add: (book: Book, title: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

/**
 * Persistence.
 *
 * The cart lives in `localStorage` so it survives reloads and is shared across
 * tabs (the `storage` event keeps them in step). It is read through
 * `useSyncExternalStore`: the server and the first client render both see an
 * empty cart, then React swaps in the stored one — no hydration mismatch.
 *
 * The key is versioned so a future change to `CartLine` can drop old data
 * instead of misreading it.
 */
const STORAGE_KEY = "bienavenidas.cart.v1";
const EMPTY: CartLine[] = [];

let snapshot: CartLine[] | null = null;
const listeners = new Set<() => void>();

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;

  return (
    typeof line.slug === "string" &&
    typeof line.title === "string" &&
    Number.isInteger(line.amount) &&
    (line.currency === "EUR" || line.currency === "USD") &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) > 0
  );
}

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : EMPTY;
  } catch {
    // Private mode, blocked storage or corrupt JSON: start empty.
    return EMPTY;
  }
}

function getSnapshot() {
  snapshot ??= read();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function write(next: CartLine[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Still works for this tab; it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = read();
    listener();
  }

  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (current: CartLine[]) => CartLine[]) {
  write(change(getSnapshot()));
}

function clamp(quantity: number) {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((book: Book, title: string) => {
    update((current) => {
      const existing = current.find((line) => line.slug === book.slug);
      if (existing) {
        return current.map((line) =>
          line.slug === book.slug
            ? { ...line, quantity: clamp(line.quantity + 1) }
            : line,
        );
      }

      return [
        ...current,
        {
          slug: book.slug,
          title,
          amount: book.price.amount,
          currency: book.price.currency,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    update((current) =>
      current.map((line) =>
        line.slug === slug ? { ...line, quantity: clamp(quantity) } : line,
      ),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    update((current) => current.filter((line) => line.slug !== slug));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      add,
      setQuantity,
      remove,
      clear,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: lines.reduce(
        (sum, line) => sum + line.amount * line.quantity,
        0,
      ),
    }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
}
