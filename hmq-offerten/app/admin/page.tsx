import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/standorte"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Standorte</h2>
          <p className="text-gray-600">Standorte verwalten (hinzufügen, bearbeiten, löschen)</p>
        </Link>

        <Link
          href="/admin/ansprechpartner"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Ansprechpartner</h2>
          <p className="text-gray-600">Ansprechpartner verwalten (hinzufügen, bearbeiten, löschen)</p>
        </Link>
      </div>

      <div className="mt-8">
        <Link
          href="/offerte"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Zurück zum Offerten-Formular
        </Link>
      </div>
    </main>
  );
}
