/**
 * ThemeSwitcher — 主题模式切换按钮。
 *
 * 支持三种模式：
 * - Light（浅色）
 * - Dark（深色）
 * - System（跟随系统）
 *
 * 使用 next-themes 的 useTheme hook。
 * 切换时带有平滑的图标过渡动画。
 */

'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'light', label: '浅色模式', icon: Sun },
  { value: 'dark', label: '深色模式', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-9 w-9'
        )}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">切换主题</span>
      </span>
    );
  }

  const currentTheme = themes.find((t) => t.value === theme) ?? themes[2];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-9 w-9 transition-all duration-300',
          'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-[1.2rem] w-[1.2rem] transition-all duration-500',
            'rotate-0 scale-100'
          )}
        />
        <span className="sr-only">切换主题</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.value;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isActive && 'font-medium text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}