/**
 * ThemeProviderWrapper — 客户端组件，桥接 useThemeConfig hook 和 ThemeProvider。
 *
 * 由于 layout.tsx 是 Server Component，无法直接使用 hooks，
 * 通过此组件将主题配置注入到客户端树中。
 */

'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useThemeConfig } from '@/hooks/use-theme-config';

interface Props {
  children: ReactNode;
}

export function ThemeProviderWrapper({ children }: Props) {
  const config = useThemeConfig();

  return <ThemeProvider config={config}>{children}</ThemeProvider>;
}