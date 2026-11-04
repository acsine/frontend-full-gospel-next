"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeleteTask, useTasks, useToggleTask } from "../hooks/use-tasks";
import { useTasksUi } from "../store/tasks-ui.store";

export function TaskList() {
  const { data, isPending, isError, refetch } = useTasks();
  const filter = useTasksUi((s) => s.filter);
  const toggle = useToggleTask();
  const remove = useDeleteTask();

  if (isPending) return <p className="text-muted">Chargement des tâches…</p>;

  if (isError)
    return (
      <div role="alert">
        <p>Impossible de charger les tâches.</p>
        <Button variant="secondary" className="mt-3" onClick={() => refetch()}>
          Réessayer
        </Button>
      </div>
    );

  const tasks = data.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done,
  );

  if (tasks.length === 0)
    return (
      <p className="text-muted">
        Aucune tâche ici. Ajoutez-en une avec le champ ci-dessus.
      </p>
    );

  return (
    <ul className="divide-line rounded-panel border-line bg-surface divide-y border">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 px-4 py-3">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => toggle.mutate({ id: task.id, done: e.target.checked })}
            aria-label={`Marquer « ${task.title} » comme terminée`}
            className="size-5 accent-[var(--accent)]"
          />
          <span className={cn("flex-1", task.done && "text-muted line-through")}>
            {task.title}
          </span>
          <Button
            variant="danger"
            className="min-h-9"
            onClick={() => remove.mutate(task.id)}
            aria-label={`Supprimer « ${task.title} »`}
          >
            Supprimer
          </Button>
        </li>
      ))}
    </ul>
  );
}
