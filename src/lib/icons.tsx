import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Sofa,
  Plug,
  Shirt,
  BookOpen,
  Gamepad2,
  Utensils,
  Sprout,
  Package,
  TreePine,
  Car,
  Beef,
  ShowerHead,
  Coffee,
  Tv,
  Cloud,
  Smartphone,
  Plane,
  CarFront,
  Target,
  PartyPopper,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import type { Category, NotificationType } from './types'
import { CATEGORIES } from './impact'

// One cohesive icon system (Lucide) in place of emoji, so the UI reads as
// designed rather than default. Category + analogy glyphs live here; UI chrome
// icons are imported directly from lucide-react in each component.

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Furniture: Sofa,
  Electronics: Plug,
  Clothing: Shirt,
  'Books & Media': BookOpen,
  'Toys & Games': Gamepad2,
  Kitchen: Utensils,
  Garden: Sprout,
  Other: Package,
}

// Icons for the fun CO₂ equivalents, keyed by the id set in impact.ts.
export const EQUIVALENT_ICON: Record<string, LucideIcon> = {
  tree: TreePine,
  car: Car,
  burger: Beef,
  shower: ShowerHead,
  coffee: Coffee,
  stream: Tv,
  balloon: Cloud,
  phone: Smartphone,
  flight: Plane,
  caryear: CarFront,
}

export const NOTIF_ICON: Record<NotificationType, LucideIcon> = {
  match: Target,
  claim: PartyPopper,
  message: MessageCircle,
}

// Pre-rendered SVG strings for Leaflet map pins (divIcon takes HTML, not React).
export const CATEGORY_PIN_SVG: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [
    c,
    renderToStaticMarkup(
      createElement(CATEGORY_ICON[c], {
        size: 18,
        color: '#05714a',
        strokeWidth: 2.4,
        absoluteStrokeWidth: true,
      }),
    ),
  ]),
) as Record<Category, string>
