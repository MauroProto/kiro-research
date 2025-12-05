"use client";

import { useEffect } from "react";

/**
 * Suppresses errors from wallet extensions (MetaMask, Backpack, etc.)
 * These extensions throw errors when there's no connected wallet
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress unhandled promise rejections from wallet extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Check if it's a wallet extension error
      if (
        error?.code === 4001 || // User rejected
        error?.message?.includes("wallet") ||
        error?.message?.includes("ethereum") ||
        error?.message?.includes("account") ||
        (typeof error === "object" && error !== null && "code" in error)
      ) {
        event.preventDefault();
        return;
      }
    };

    // Suppress errors from wallet injection scripts
    const handleError = (event: ErrorEvent) => {
      if (
        event.filename?.includes("inpage.js") ||
        event.filename?.includes("evmAsk") ||
        event.filename?.includes("installHook") ||
        event.message?.includes("ethereum") ||
        event.message?.includes("redefine property")
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
