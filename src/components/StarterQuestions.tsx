'use client';

import React from 'react';
import { Pizza, BatteryCharging, ShoppingBag, Sprout, ArrowRight } from 'lucide-react';
import { CategoryPills } from './CategoryPills';

interface StarterQuestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const StarterQuestions: React.FC<StarterQuestionsProps> = ({ onSelectPrompt }) => {
  const starters = [
    {
      id: 'pizza-box',
      icon: <Pizza size={16} />,
      question: 'Where does a used pizza box go?',
      hint: 'Cardboard vs. food grease edge case',
    },
    {
      id: 'batteries',
      icon: <BatteryCharging size={16} />,
      question: 'How do I safely dispose of old batteries?',
      hint: 'Fire hazard & toxic heavy metals',
    },
    {
      id: 'plastic-bags',
      icon: <ShoppingBag size={16} />,
      question: 'Can I put plastic bags in curbside recycling?',
      hint: 'Sorting machine tangling & store return',
    },
    {
      id: 'home-compost',
      icon: <Sprout size={16} />,
      question: 'What items are safe to put in home compost?',
      hint: 'Food scraps, yard trimmings, and paper',
    },
  ];

  return (
    <div className="welcome-container">
      <div className="welcome-hero-badge">
        <span>🌱 AI Waste Awareness Assistant</span>
      </div>

      <h1 className="welcome-title">Sort Smarter. Waste Less.</h1>
      <p className="welcome-desc">
        Ask any question about separating trash, recycling rules, composting, or tricky items
        like batteries and electronics.
      </p>

      {/* Waste Category Legend */}
      <CategoryPills onSelectCategory={onSelectPrompt} />

      {/* Suggested Starter Questions */}
      <div className="starter-grid" role="group" aria-label="Suggested starter questions">
        {starters.map((starter) => (
          <button
            key={starter.id}
            type="button"
            className="starter-card"
            onClick={() => onSelectPrompt(starter.question)}
          >
            <div className="starter-card-icon" aria-hidden="true">
              {starter.icon}
            </div>
            <div>
              <span className="starter-card-text">{starter.question}</span>
              <span className="starter-card-hint">{starter.hint}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
