"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <h1 className="text-xl font-semibold">Un problème est survenu</h1>
      <p className="text-muted mt-2">
        La page n'a pas pu se charger. Réessayez dans un instant.
      </p>
      <Button className="mt-4" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
