"use client";

import { useEffect } from "react";

import { useCart } from "./cart";

/** Empties the cart once, after Stripe confirms the order was paid. */
export function ClearCart() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
