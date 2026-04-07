'use client';

export default function AnsprechpartnerTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Ansprechpartner</h2>
      <div className="space-y-4">
        {[
          { name: 'Benjamin Patt', funktion: 'Geomatiker EFZ, Bereichsleiter Beweissicherung', email: 'bpa@hmq.ch' },
          { name: 'Moreno Meier', funktion: 'BSc FHNW in Geomatik, Geschäftsstellenleitung Zürich', email: 'mme@hmq.ch' },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-lg">{p.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{p.name}</div>
              <div className="text-sm text-gray-500">{p.funktion}</div>
              <div className="text-sm text-[#1e3a5f]">{p.email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
