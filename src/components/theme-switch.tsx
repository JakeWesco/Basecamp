"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui";
import { readThemeChoice, setThemeChoice, subscribeTheme, type ThemeChoice } from "@/lib/theme";

/** Light / Dark / System. Remembered on this device. */
export function ThemeSwitch() {
  const choice = useSyncExternalStore<ThemeChoice>(subscribeTheme, readThemeChoice, () => "system");
  return (
    <SegmentedControl
      label="Appearance"
      hint={choice === "system" ? "Follows your device setting." : undefined}
      value={choice}
      onValueChange={(v) => setThemeChoice(v as ThemeChoice)}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "System" },
      ]}
    />
  );
}
