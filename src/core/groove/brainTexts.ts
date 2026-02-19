/**
 * Load algorithm text files via Vite glob. Paths relative to this file.
 */

const modules = import.meta.glob("../../../algorithm/**/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const pathList = Object.keys(modules);

/**
 * Return raw text for the first path that contains pathContains.
 */
export function getText(pathContains: string): string | undefined {
  const key = pathList.find((p) => p.includes(pathContains));
  if (!key) return undefined;
  const v = modules[key];
  return typeof v === "string" ? v : (v as { default?: string })?.default;
}

/**
 * List all paths (keys) that start with optional prefix (match against path string).
 */
export function listTexts(prefix?: string): string[] {
  if (prefix == null) return [...pathList];
  return pathList.filter((p) => p.includes(prefix));
}
