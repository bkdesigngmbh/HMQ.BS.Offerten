import StandorteListe from "@/components/admin/StandorteListe";
import Link from "next/link";

export default function StandortePage() {
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

      <h1 className="text-3xl font-bold mb-8">Standorte verwalten</h1>

      <StandorteListe />
    </main>
  );
}
