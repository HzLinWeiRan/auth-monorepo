/**
 * ThemeCustomizer — 主题色彩方案选择面板。
 *
 * 从 theme-registry 获取可用主题列表，支持：
 * - 内置主题（public/themes/*.css）
 * - 自定义主题（通过 SkinImportDialog 注册）
 *
 * 选中后实时应用，无需刷新。
 */

'use client';

import { useState } from 'react';
import { Paintbrush, Check, Undo2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useThemeConfigContext } from './ThemeProvider';

export function ThemeCustomizer() {
  const config = useThemeConfigContext();
  const [open, setOpen] = useState(false);

  if (!config) return null;

  const { themeId, themes, selectTheme } = config;

  const hasCustomTheme = themeId !== null;

  // 分离内置和自定义主题
  const builtinThemes = themes.filter((t) => t.builtin);
  const customThemes = themes.filter((t) => !t.builtin);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-9 w-9 transition-all duration-300',
          hasCustomTheme && 'text-primary',
          'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Paintbrush
          className={cn(
            'h-[1.2rem] w-[1.2rem] transition-all duration-500',
            hasCustomTheme && 'fill-primary/20'
          )}
        />
        <span className="sr-only">自定义色彩方案</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>色彩方案</span>
            {hasCustomTheme && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  selectTheme(null);
                }}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                重置
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {/* 默认选项 */}
        <DropdownMenuItem
          onClick={() => selectTheme(null)}
          className={cn(
            'flex items-center gap-3 cursor-pointer',
            !hasCustomTheme && 'font-medium text-primary'
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background">
            {!hasCustomTheme && <Check className="h-3.5 w-3.5" />}
          </div>
          <div className="flex flex-col">
            <span>默认主题</span>
            <span className="text-xs text-muted-foreground">
              系统内置中性色调
            </span>
          </div>
        </DropdownMenuItem>

        {/* 内置主题列表 */}
        {builtinThemes.map((theme) => {
          const isActive = themeId === theme.id;

          return (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isActive && 'font-medium text-primary'
              )}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                style={{
                  backgroundColor: theme.previewColor ?? 'oklch(0.205 0 0)',
                }}
              >
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span>{theme.name}</span>
                <span className="text-xs text-muted-foreground">
                  {theme.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}

        {/* 自定义主题（如果有） */}
        {customThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                自定义主题
              </DropdownMenuLabel>
              {customThemes.map((theme) => {
                const isActive = themeId === theme.id;

                return (
                  <DropdownMenuItem
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    className={cn(
                      'flex items-center gap-3 cursor-pointer',
                      isActive && 'font-medium text-primary'
                    )}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                      style={{
                        backgroundColor: theme.previewColor ?? 'oklch(0.546 0.245 262.881)',
                      }}
                    >
                      {isActive && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span>{theme.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {theme.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}