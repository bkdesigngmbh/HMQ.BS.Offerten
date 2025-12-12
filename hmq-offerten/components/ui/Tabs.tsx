interface TabsProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function Tabs({ tabs, activeIndex, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-4">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            onClick={() => onChange(index)}
            className={`
              py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeIndex === index
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
