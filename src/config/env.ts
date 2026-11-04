import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage.
 * Si une variable est invalide, l'app échoue tout de suite avec un message clair.
 * Pour en ajouter une : la déclarer ici ET dans .env.example.
 */
const schema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Next Starter"),
  NEXT_PUBLIC_API_URL: z.string().default(""),
});

export const env = schema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || undefined,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || undefined,
});
