
export const QUEST_ICONS = [
  '⚔️', '🎯', '⭐', '🏔️', '🔥', '⚡', '🏆', '🌐', '🏠', '💼',
  '📖', '🎵', '📷', '🎨', '🏋️', '🚲', '✈️', '🍃', '🛡️', '👑',
  '💎', '🚀', '☕', '🌊', '🌅', '❤️', '🌲', '🧭', '⚓', '✨'
]

const LUCIDE_TO_EMOJI: Record<string, string> = {
  swords: '⚔️',
  target: '🎯',
  star: '⭐',
  mountain: '🏔️',
  flame: '🔥',
  zap: '⚡',
  trophy: '🏆',
  globe: '🌐',
  home: '🏠',
  briefcase: '💼',
  book: '📖',
  music: '🎵',
  camera: '📷',
  palette: '🎨',
  dumbbell: '🏋️',
  bike: '🚲',
  plane: '✈️',
  leaf: '🍃',
  shield: '🛡️',
  crown: '👑',
  gem: '💎',
  rocket: '🚀',
  coffee: '☕',
  waves: '🌊',
  sunset: '🌅',
  heart: '❤️',
  treepine: '🌲',
  compass: '🧭',
  anchor: '⚓',
  sparkles: '✨',
}

export function QuestIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const displayEmoji = LUCIDE_TO_EMOJI[name] ?? name
  
  return (
    <span 
      className={className} 
      style={{ 
        fontSize: `${size}px`, 
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      role="img"
      aria-label="quest icon"
    >
      {displayEmoji}
    </span>
  )
}
