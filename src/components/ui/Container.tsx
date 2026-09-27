import type { ReactNode } from "react";

/** Shared horizontal rhythm. Padding is logical (`ps`/`pe`) so it mirrors
 * correctly if an RTL locale is ever added. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl ps-6 pe-6 ${className}`}>
      {children}
    </div>
  );
}
