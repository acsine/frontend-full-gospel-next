import type { Task } from "@/features/tasks/schemas/task.schema";

/**
 * Faux backend en mémoire pour que le starter fonctionne sans base de données.
 * À REMPLACER par votre vraie source de données (Prisma, Drizzle, API externe…).
 */
const g = globalThis as unknown as { __tasks?: Task[] };

export const tasks: Task[] = (g.__tasks ??= [
  {
    id: "1",
    title: "Lire le README du projet",
    done: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Créer votre première feature dans src/features",
    done: false,
    createdAt: new Date().toISOString(),
  },
]);
