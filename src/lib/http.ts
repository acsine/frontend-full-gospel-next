import type { ZodType } from "zod";
import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Client HTTP unique du projet.
 * - Préfixe l'URL de base
 * - Sérialise le JSON
 * - Valide la réponse avec un schéma Zod : si le backend change, on le voit tout de suite.
 */
export async function http<T>(
  path: string,
  schema: ZodType<T>,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(message || res.statusText, res.status);
  }

  return schema.parse(await res.json());
}
