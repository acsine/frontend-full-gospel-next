"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "../hooks/use-tasks";
import { createTaskSchema } from "../schemas/task.schema";

export function TaskForm() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const { mutate, isPending } = useCreateTask();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createTaskSchema.safeParse({ title });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    mutate(result.data, { onSuccess: () => setTitle("") });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex items-start gap-3">
      <div className="flex-1">
        <Input
          label="Nouvelle tâche"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
          placeholder="Ex. : relire le cahier des charges"
        />
      </div>
      <Button type="submit" disabled={isPending} className="mt-[1.775rem]">
        Ajouter
      </Button>
    </form>
  );
}
