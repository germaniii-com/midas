import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { THEME_OPTIONS, THEME_COLORS, type Theme } from '../constants/preferences';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
}

export default function ThemeSelectorModal({
  isOpen,
  onClose,
  currentTheme,
  onSelect,
}: ThemeSelectorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      backdrop="blur"
      size="lg"
      scrollBehavior="inside"
      className="sm:max-w-[64rem]"
      motionProps={{
        variants: {
          enter: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.95, y: 20 },
        },
      }}
    >
      <ModalContent>
        <ModalHeader className="justify-center text-lg">Choose a theme</ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-6 px-4 sm:px-0">
            {THEME_OPTIONS.map((opt) => {
              const colors = THEME_COLORS[opt.value];
              const isSelected = opt.value === currentTheme;
              return (
                <div
                  key={opt.value}
                  data-theme={opt.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(opt.value);
                      onClose();
                    }
                  }}
                  className={`
                    relative rounded-xl p-4 cursor-pointer transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]
                    ${isSelected ? 'ring-2 ring-offset-2 ring-[var(--color-text)] ring-offset-[var(--color-surface-secondary)]' : 'ring-1 ring-[var(--color-border)]'}
                  `}
                  style={{ backgroundColor: colors.surface }}
                >
                  {/* Color swatches row */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colors.surfaceSecondary }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colors.border }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colors.success }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colors.danger }} />
                  </div>

                  {/* Theme name */}
                  <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                    {opt.label.split(' ')[0]}
                  </p>
                  {opt.label.includes(' ') && (
                    <p className="text-sm font-semibold truncate -mt-0.5" style={{ color: colors.text }}>
                      {opt.label.split(' ').slice(1).join(' ')}
                    </p>
                  )}

                  {/* Muted sample */}
                  <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
                    Aa
                  </p>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.text }}>
                      <CheckIcon className="w-3 h-3" style={{ color: colors.surface }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
