import Image from "next/image";
import { env } from "@/config/env";

export function Header() {
  return (
    <header className="border-line bg-surface border-b">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Image
          src="/logo.jpg"
          alt="Logo"
          width={32}
          height={32}
          className="rounded-lg object-contain"
        />
        <span className="font-semibold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</span>
      </div>
    </header>
  );
}
