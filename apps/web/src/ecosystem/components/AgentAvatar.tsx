import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

import { BRAND_PRIMARY_HEX } from '@/redesign/lib/button-styles';

const AGENT_AVATAR_BLUE = BRAND_PRIMARY_HEX;

function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

type Props = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'w-12 h-12 text-sm',
  md: 'w-20 h-20 text-lg',
  lg: 'w-28 h-28 text-2xl',
};

export default function AgentAvatar({ name, avatarUrl, className, size = 'md' }: Props) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn(sizeClass[size], 'rounded-full object-cover border-4 border-background shadow', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass[size],
        'rounded-full flex items-center justify-center font-bold text-white border-4 border-background shadow',
        className,
      )}
      style={{ backgroundColor: AGENT_AVATAR_BLUE }}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}

export function AgentAvatarPlaceholder({ className, size = 'md' }: { className?: string; size?: Props['size'] }) {
  return (
    <div
      className={cn(
        sizeClass[size],
        'rounded-full bg-muted flex items-center justify-center border-4 border-background shadow',
        className,
      )}
    >
      <User className={cn(size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-10 h-10' : 'w-6 h-6', 'text-muted-foreground')} />
    </div>
  );
}
