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
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-1">{titel}</h3>
      {untertitel && (
        <p className="text-sm text-gray-500 mb-3">{untertitel}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {sonstigesItems.map((item) => (
            <Input
              key={item.key}
              label=""
              placeholder={item.placeholder || 'Sonstiges...'}
              value={item.value}
              onChange={(e) => onSonstigesChange?.(item.key, e.target.value)}
              className="text-sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
