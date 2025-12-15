import OfferteForm from '@/components/offerte/OfferteForm';

export default function OffertePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-gray-900">
          Neue Offerte erstellen
        </h1>
        <p className="mt-2 text-gray-600">
          Füllen Sie die Angaben aus und generieren Sie eine professionelle Word-Offerte.
        </p>
      </div>

      {/* Form */}
      <OfferteForm />
    </div>
  );
}
