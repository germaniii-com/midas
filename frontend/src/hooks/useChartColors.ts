import { THEME_COLORS } from '../constants/preferences';
import { useTheme } from './useTheme';

export function useChartColors(): string[] {
  const { theme } = useTheme();
  return THEME_COLORS[theme].chart;
}
