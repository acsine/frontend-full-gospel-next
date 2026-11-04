import { z } from "zod";
import { http } from "@/lib/http";
import { taskSchema, tasksSchema, type CreateTaskInput } from "../schemas/task.schema";

/**
 * Couche d'accès à l'API : des fonctions simples, sans React.
 * Les hooks (../hooks) les appellent, les composants n'y touchent jamais directement.
 */
export const tasksApi = {
  list: () => http("/api/tasks", tasksSchema),
  create: (input: CreateTaskInput) =>
    http("/api/tasks", taskSchema, { method: "POST", body: input }),
  toggle: (id: string, done: boolean) =>
    http(`/api/tasks/${id}`, taskSchema, { method: "PATCH", body: { done } }),
  remove: (id: string) =>
    http(`/api/tasks/${id}`, z.object({ ok: z.literal(true) }), { method: "DELETE" }),
};
