"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Book } from "@/types/book";

export type CartLine = {
  slug: string;
  title: string;
  /** Minor units, copied at add time so a later price change can't rewrite history. */
  amount: number;
  currency: Book["price"]["currency"];
  quantity: number;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  /** Total in minor units. Kept integer end to end — never round through floats. */
  total: number;
  add: (book: Book, title: string) => void;
  remove: (slug: string) => void;
};

const CartContext = createContext<CartValue | null>(null);

/**
 * Client-side cart.
 *
 * Deliberately in-memory: there is no payment provider wired up yet, so
 * persisting would imply a durability this doesn't have. `CartLine` already
 * stores minor units so a real checkout can be dropped in without reworking
 * the money handling.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((book: Book, title: string) => {
    setLines((current) => {
      const existing = current.find((line) => line.slug === book.slug);
      if (existing) {
        return current.map((line) =>
          line.slug === book.slug
            ? { ...line, quantity: line.quantity + 1 }
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

  const remove = useCallback((slug: string) => {
    setLines((current) => current.filter((line) => line.slug !== slug));
  }, []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      add,
      remove,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: lines.reduce(
        (sum, line) => sum + line.amount * line.quantity,
        0,
      ),
    }),
    [lines, add, remove],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
}
