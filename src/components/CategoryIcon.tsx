import React from 'react';
import {
  Briefcase,
  Camera,
  Car,
  GraduationCap,
  Grid,
  HardHat,
  HeartHandshake,
  Laptop,
  PawPrint,
  Scissors,
  Sparkles,
  Trees,
  Truck,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Sparkles,
  Car,
  Laptop,
  GraduationCap,
  Camera,
  Scissors,
  Truck,
  HeartHandshake,
  Briefcase,
  Trees,
  UtensilsCrossed,
  HardHat,
  PawPrint,
  Grid,
};

export const CategoryIcon: React.FC<{ name?: string; className?: string }> = ({
  name = 'Grid',
  className = 'w-5 h-5',
}) => {
  const Icon = ICON_MAP[name] || Grid;
  return <Icon className={className} />;
};
