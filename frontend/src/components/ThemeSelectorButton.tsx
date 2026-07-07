import { useState } from 'react';
import { Button } from '@heroui/react';
import { THEME_OPTIONS, THEME_COLORS, type Theme } from '../constants/preferences';
import ThemeSelectorModal from './ThemeSelectorModal';

interface ThemeSelectorButtonProps {
  theme: Theme;
  onSelect: (theme: Theme) => void;
  size?: 'sm' | 'md';
}

export default function ThemeSelectorButton({ theme, onSelect, size = 'sm' }: ThemeSelectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = THEME_COLORS[theme];
  const label = THEME_OPTIONS.find((opt) => opt.value === theme)?.label ?? theme;

  return (
    <>
      <Button
        size={size}
        variant="flat"
        onPress={() => setIsOpen(true)}
        className="min-w-0 px-3 gap-2"
        endContent={
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors.text }} />
        }
      >
        <span className="truncate max-w-[100px]">{label}</span>
      </Button>
      <ThemeSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentTheme={theme}
        onSelect={onSelect}
      />
    </>
  );
}
