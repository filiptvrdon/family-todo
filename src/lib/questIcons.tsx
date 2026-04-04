import {
  Swords, Target, Star, Mountain, Flame, Zap, Trophy, Globe, Home,
  Briefcase, BookOpen, Music, Camera, Palette, Dumbbell, Bike, Plane,
  Leaf, Shield, Crown, Gem, Rocket, Coffee, Waves, Sunset, Heart,
  TreePine, Compass, Anchor, Sparkles,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export const QUEST_ICONS: { name: string; component: React.FC<LucideProps> }[] = [
  { name: 'swords',    component: Swords    },
  { name: 'target',    component: Target    },
  { name: 'star',      component: Star      },
  { name: 'mountain',  component: Mountain  },
  { name: 'flame',     component: Flame     },
  { name: 'zap',       component: Zap       },
  { name: 'trophy',    component: Trophy    },
  { name: 'globe',     component: Globe     },
  { name: 'home',      component: Home      },
  { name: 'briefcase', component: Briefcase },
  { name: 'book',      component: BookOpen  },
  { name: 'music',     component: Music     },
  { name: 'camera',    component: Camera    },
  { name: 'palette',   component: Palette   },
  { name: 'dumbbell',  component: Dumbbell  },
  { name: 'bike',      component: Bike      },
  { name: 'plane',     component: Plane     },
  { name: 'leaf',      component: Leaf      },
  { name: 'shield',    component: Shield    },
  { name: 'crown',     component: Crown     },
  { name: 'gem',       component: Gem       },
  { name: 'rocket',    component: Rocket    },
  { name: 'coffee',    component: Coffee    },
  { name: 'waves',     component: Waves     },
  { name: 'sunset',    component: Sunset    },
  { name: 'heart',     component: Heart     },
  { name: 'treepine',  component: TreePine  },
  { name: 'compass',   component: Compass   },
  { name: 'anchor',    component: Anchor    },
  { name: 'sparkles',  component: Sparkles  },
]

const iconMap = Object.fromEntries(QUEST_ICONS.map(i => [i.name, i.component]))

export function QuestIcon({ name, size = 18, ...props }: { name: string; size?: number } & Omit<LucideProps, 'size'>) {
  const Icon = iconMap[name] ?? Star
  return <Icon size={size} {...props} />
}
