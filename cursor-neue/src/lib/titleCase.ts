/** Title-case a name. Keeps short all-caps tokens such as UI. */
export function titleCaseName(text: string): string {
  return text.replace(/\S+/g, (word) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/** Repo folder label: `cursor-icons` → `Cursor Icons`. `ios` stays `iOS`. */
export function titleCaseFolderName(text: string): string {
  return titleCaseName(text.replace(/[-_]+/g, " ").trim()).replace(/\bIos\b/g, "iOS");
}
