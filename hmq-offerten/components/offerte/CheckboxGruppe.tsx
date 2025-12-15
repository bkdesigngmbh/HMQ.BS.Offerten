import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';

interface CheckboxItem {
  key: string;
  label: string;
  checked: boolean;
}

interface CheckboxGruppeProps {
  titel: string;
  untertitel?: string;
  checkboxen: CheckboxItem[];
  sonstigesItems?: { key: string; value: string; placeholder?: string }[];
  onChange: (key: string, value: boolean) => void;
  onSonstigesChange?: (key: string, value: string) => void;
}

export default function CheckboxGruppe({
  titel,
  untertitel,
  checkboxen,
  sonstigesItems = [],
  onChange,
  onSonstigesChange,
}: CheckboxGruppeProps) {
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-5 space-y-4">
      <div>
        <h4 className="font-medium text-gray-900">{titel}</h4>
        {untertitel && (
          <p className="text-sm text-gray-500 mt-0.5">{untertitel}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {checkboxen.map((item) => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={item.checked}
            onChange={(e) => onChange(item.key, e.target.checked)}
          />
        ))}
      </div>

      {sonstigesItems.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sonstigesItems.map((item) => (
              <Input
                key={item.key}
                label="Sonstiges"
                placeholder={item.placeholder || 'Eingabe...'}
                value={item.value}
                onChange={(e) => onSonstigesChange?.(item.key, e.target.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
