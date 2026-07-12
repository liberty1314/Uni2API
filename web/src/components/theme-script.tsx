const themeScript = `
(() => {
  try {
    const currentKey = "uni2api-theme";
    const legacyKey = "chatgpt2api-theme";
    let stored = localStorage.getItem(currentKey);
    if (stored !== "light" && stored !== "dark" && stored !== "system") {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy === "light" || legacy === "dark" || legacy === "system") {
        localStorage.setItem(currentKey, legacy);
        stored = legacy;
      }
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      id="uni2api-theme-script"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
