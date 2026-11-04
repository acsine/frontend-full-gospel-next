import { NextResponse } from "next/server";
import { createTaskSchema } from "@/features/tasks/schemas/task.schema";
import { tasks } from "./store";

export async function GET() {
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const parsed = createTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const task = {
    id: crypto.randomUUID(),
    title: parsed.data.title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  return NextResponse.json(task, { status: 201 });
}
