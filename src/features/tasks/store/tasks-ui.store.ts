import { create } from "zustand";

export type TaskFilter = "all" | "open" | "done";

/**
 * Zustand = état d'INTERFACE uniquement (filtre, panneau ouvert, thème…).
 * Les données qui viennent du serveur restent dans TanStack Query.
 */
type TasksUiState = {
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
};

export const useTasksUi = create<TasksUiState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));
