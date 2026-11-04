import { NextResponse } from "next/server";
import { z } from "zod";
import { tasks } from "../store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = z.object({ done: z.boolean() }).safeParse(await req.json());
  const task = tasks.find((t) => t.id === id);
  if (!parsed.success)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  if (!task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  task.done = parsed.data.done;
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1)
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  tasks.splice(index, 1);
  return NextResponse.json({ ok: true });
}
