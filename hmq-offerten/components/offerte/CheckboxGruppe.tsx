"use client";

import Checkbox from "@/components/ui/Checkbox";
import { Leistung } from "@/lib/types";

interface CheckboxGruppeProps {
  leistungen: Leistung[];
  onToggle: (id: string) => void;
}

export default function CheckboxGruppe({ leistungen, onToggle }: CheckboxGruppeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {leistungen.map((leistung) => (
        <Checkbox
          key={leistung.id}
          label={leistung.name}
          name={`leistung-${leistung.id}`}
          checked={leistung.checked}
          onChange={() => onToggle(leistung.id)}
        />
      ))}
    </div>
  );
}
