// components/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  children: ReactNode;
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// Ekspor useTheme dari next-themes agar komponen lain bisa menggunakannya
export { useTheme } from "next-themes";