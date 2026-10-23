'use client';

import React from 'react';
import { Recycle, Sprout, Trash2, AlertTriangle, Cpu } from 'lucide-react';

interface CategoryPillsProps {
  onSelectCategory?: (categoryName: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      id: 'recycle',
      label: 'Recycling',
      icon: <Recycle size={13} />,
      className: 'recycle',
      sampleQuery: 'What plastics and metals can go into blue bin recycling?',
    },
    {
      id: 'compost',
      label: 'Compost & Organics',
      icon: <Sprout size={13} />,
      className: 'compost',
      sampleQuery: 'What food scraps and paper can be composted?',
    },
    {
      id: 'hazardous',
      label: 'Hazardous Waste',
      icon: <AlertTriangle size={13} />,
      className: 'hazardous',
      sampleQuery: 'How do I safely dispose of batteries and chemicals?',
    },
    {
      id: 'ewaste',
      label: 'E-Waste',
      icon: <Cpu size={13} />,
      className: 'ewaste',
      sampleQuery: 'Where can I recycle old cables, phones, and electronics?',
    },
    {
      id: 'landfill',
      label: 'Landfill / Trash',
      icon: <Trash2 size={13} />,
      className: 'landfill',
      sampleQuery: 'Which common items must go into general landfill?',
    },
  ];

  return (
    <div className="category-pills" role="region" aria-label="Waste sorting categories">
      {categories.map((cat) => (
        <span
          key={cat.id}
          className={`cat-pill ${cat.className}`}
          style={{ cursor: onSelectCategory ? 'pointer' : 'default' }}
          onClick={() => onSelectCategory && onSelectCategory(cat.sampleQuery)}
          title={onSelectCategory ? `Click to ask about ${cat.label}` : cat.label}
        >
          {cat.icon}
          {cat.label}
        </span>
      ))}
    </div>
  );
};
