import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Calculator,
  Crown,
  Heart,
  Home,
  Layers,
  MapPin,
  MessageCircle,
  Search,
  TrendingUp,
  UserCircle,
  UserSearch,
  Users,
} from 'lucide-react';

export const SECTION_ICON_OPTIONS = [
  { id: 'user-search', label: 'Подбор' },
  { id: 'building2', label: 'Здание' },
  { id: 'user-circle', label: 'Профиль' },
  { id: 'calculator', label: 'Калькулятор' },
  { id: 'map-pin', label: 'Карта' },
  { id: 'search', label: 'Поиск' },
  { id: 'message-circle', label: 'Чат' },
  { id: 'home', label: 'Дом' },
  { id: 'layers', label: 'Слои' },
  { id: 'users', label: 'Люди' },
  { id: 'heart', label: 'Сердце' },
  { id: 'crown', label: 'Корона' },
  { id: 'trending-up', label: 'Рост' },
] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  'user-search': UserSearch,
  building2: Building2,
  'user-circle': UserCircle,
  calculator: Calculator,
  'map-pin': MapPin,
  search: Search,
  'message-circle': MessageCircle,
  home: Home,
  layers: Layers,
  users: Users,
  heart: Heart,
  crown: Crown,
  'trending-up': TrendingUp,
};

export function sectionIcon(id: string): LucideIcon {
  return ICON_MAP[id] ?? Building2;
}
