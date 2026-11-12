// Light, dark or follow the device. The choice lives in localStorage and is
// applied as data-theme on <html>. "system" removes the attribute, so the
// prefers-color-scheme rules in globals.css take over.

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "basecamp-theme";
const CHANGE_EVENT = "basecamp-theme-change";

/**
 * Runs in <head> before the page paints, so there is never a flash of the
 * wrong theme. Kept tiny and dependency free.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function readThemeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private mode: the choice still applies to this page.
  }
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Calls back when the choice or the device setting changes (also in other tabs). */
export function subscribeTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    const value = e.newValue;
    if (value === "light" || value === "dark") document.documentElement.dataset.theme = value;
    else delete document.documentElement.dataset.theme;
    callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", callback);
  };
}
