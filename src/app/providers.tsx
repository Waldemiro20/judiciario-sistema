"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {children}
      <Toaster />
    </AppProvider>
  );
}
