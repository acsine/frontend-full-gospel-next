import fr from "./fr.json";
import en from "./en.json";

export const dictionaries = {
  fr,
  en,
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof fr;

export { fr, en };

