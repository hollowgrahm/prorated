import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Github,
  Home,
  Menu,
  Plus,
  Search,
  Twitter,
  type LucideIcon,
} from 'lucide-react'

export type Icon = LucideIcon

export const Icons = {
  home: Home,
  search: Search,
  plus: Plus,
  briefcase: Briefcase,
  menu: Menu,
  arrowRight: ArrowRight,
  bookOpen: BookOpen,
  github: Github,
  twitter: Twitter,
} as const

export type IconName = keyof typeof Icons
