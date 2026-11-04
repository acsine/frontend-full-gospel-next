import { TaskFilterBar } from "./task-filter";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";

/** Assemble la feature. C'est le seul composant que les pages importent. */
export function TasksBoard() {
  return (
    <div className="flex flex-col gap-6">
      <TaskForm />
      <TaskFilterBar />
      <TaskList />
    </div>
  );
}
