import AnsprechpartnerListe from "@/components/admin/AnsprechpartnerListe";
import Link from "next/link";

export default function AnsprechpartnerPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Ansprechpartner verwalten</h1>

      <AnsprechpartnerListe />
    </main>
  );
}
