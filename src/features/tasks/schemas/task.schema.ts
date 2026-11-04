import { z } from "zod";

/** Forme d'une tâche renvoyée par l'API. */
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.string(),
});

export const tasksSchema = z.array(taskSchema);

/** Forme du formulaire de création. Les messages sont ceux affichés à l'utilisateur. */
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Saisissez un titre.")
    .max(120, "Le titre ne doit pas dépasser 120 caractères."),
});

// Les types TypeScript sont déduits des schémas : une seule source de vérité.
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
