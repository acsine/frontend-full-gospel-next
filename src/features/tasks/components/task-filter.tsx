"use client";

import { cn } from "@/lib/utils";
import { useTasksUi, type TaskFilter } from "../store/tasks-ui.store";

const options: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "open", label: "À faire" },
  { value: "done", label: "Terminées" },
];

export function TaskFilterBar() {
  const filter = useTasksUi((s) => s.filter);
  const setFilter = useTasksUi((s) => s.setFilter);

  return (
    <div role="group" aria-label="Filtrer les tâches" className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={filter === o.value}
          onClick={() => setFilter(o.value)}
          className={cn(
            "rounded-control min-h-9 border px-3 text-sm transition-colors",
            filter === o.value
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-surface hover:bg-bg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
