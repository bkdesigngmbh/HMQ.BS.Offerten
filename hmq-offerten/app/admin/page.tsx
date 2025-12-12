import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">Administration</h1>
      <div className="grid gap-4">
        <Link href="/admin/standorte" className="block p-6 bg-white rounded-lg shadow-sm border hover:border-blue-500 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800">Standorte</h2>
          <p className="text-sm text-gray-500 mt-1">HMQ Standorte verwalten (Adresse, Telefon)</p>
        </Link>
        <Link href="/admin/ansprechpartner" className="block p-6 bg-white rounded-lg shadow-sm border hover:border-blue-500 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800">Ansprechpartner</h2>
          <p className="text-sm text-gray-500 mt-1">Ansprechpartner verwalten (Name, Funktion, Unterschrift)</p>
        </Link>
      </div>
    </div>
  );
}
