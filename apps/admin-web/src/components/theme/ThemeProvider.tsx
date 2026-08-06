/**
 * ThemeProvider — 组合 next-themes + 自定义主题变量。
 *
 * 架构层次：
 * 1. next-themes ThemeProvider：管理 dark/light/system 模式（.dark class）
 * 2. ThemeConfigProvider (React Context)：传递主题配置状态
 * 3. 主题 CSS 文件通过 theme-loader 加载，作用域为 html.theme-{id}
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeConfig } from '@/hooks/use-theme-config';

// ---- Context：向下传递主题配置 ----
const ThemeConfigContext = createContext<ThemeConfig | null>(null);

export function useThemeConfigContext(): ThemeConfig | null {
  return useContext(ThemeConfigContext);
}

// ---- Props ----
interface Props {
  children: ReactNode;
  /** 从 useThemeConfig hook 获取的主题配置 */
  config: ThemeConfig;
}

export function ThemeProvider({ children, config }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      themes={['light', 'dark', 'system']}
    >
      <ThemeConfigContext.Provider value={config}>
        {children}
      </ThemeConfigContext.Provider>
    </NextThemesProvider>
  );
}