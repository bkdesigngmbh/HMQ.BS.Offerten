import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative px-4 py-3 text-sm font-medium
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/20 focus-visible:ring-inset
                ${isActive
                  ? 'text-[#1e3a5f]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e3a5f] rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
