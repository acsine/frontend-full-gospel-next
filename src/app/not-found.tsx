import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="text-muted mt-2">Cette adresse n'existe pas ou a été déplacée.</p>
      <Link
        href="/"
        className="text-accent mt-4 inline-block underline underline-offset-4"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
