import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/tasks.api";
import type { Task } from "../schemas/task.schema";

/** Clés de cache centralisées : évite les fautes de frappe et facilite l'invalidation. */
export const taskKeys = {
  all: ["tasks"] as const,
  list: () => [...taskKeys.all, "list"] as const,
};

export function useTasks() {
  return useQuery({ queryKey: taskKeys.list(), queryFn: tasksApi.list });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.list() }),
  });
}

/** Mise à jour optimiste : l'interface réagit tout de suite, retour arrière en cas d'erreur. */
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      tasksApi.toggle(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: taskKeys.list() });
      const previous = qc.getQueryData<Task[]>(taskKeys.list());
      qc.setQueryData<Task[]>(taskKeys.list(), (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(taskKeys.list(), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.list() }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.list() }),
  });
}
