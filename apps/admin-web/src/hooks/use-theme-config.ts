/**
 * useThemeConfig — 管理主题配置状态。
 *
 * 重构后的版本基于 CSS 文件主题系统：
 * - 从 theme-registry 获取可用主题列表
 * - 通过 theme-loader 加载/切换 CSS 主题文件
 * - 持久化主题选择到 localStorage
 * - 管理自定义主题的注册/注销
 *
 * 架构：
 *   next-themes 负责 dark/light/system 模式切换（管理 .dark class）
 *   本 hook 负责色彩方案切换（管理 theme-{id} class + CSS 文件加载）
 *   两者在 <html> 上共存：<html class="theme-blue dark">
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type ThemeManifest,
  getAllThemes,
  registerAndPersistTheme,
  unregisterAndPersistTheme,
  loadCustomThemes,
} from '@/lib/theme-registry';
import { switchTheme } from '@/lib/theme-loader';

// ---- 存储 key ----
const THEME_STORAGE_KEY = 'sso-theme-id';

export interface ThemeConfigState {
  /** 当前选中的主题 ID（null = 使用默认） */
  themeId: string | null;
  /** 所有可用主题列表 */
  themes: ThemeManifest[];
  /** 自定义主题列表 */
  customThemes: ThemeManifest[];
}

export interface ThemeConfig extends ThemeConfigState {
  /** 组件是否已挂载（避免 SSR hydration 问题） */
  mounted: boolean;
  /** 选择主题 */
  selectTheme: (id: string | null) => void;
  /** 注册自定义主题 */
  registerTheme: (manifest: ThemeManifest) => void;
  /** 注销自定义主题 */
  unregisterTheme: (id: string) => void;
  /** 重置所有主题设置 */
  resetTheme: () => void;
}

export function useThemeConfig() {
  const [themeId, setThemeId] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeManifest[]>([]);
  const [mounted, setMounted] = useState(false);

  // ---- 初始化：恢复状态 + 加载主题 ----
  useEffect(() => {
    // 恢复自定义主题
    loadCustomThemes();

    // 刷新主题列表
    setThemes(getAllThemes());

    // 从 localStorage 恢复主题选择
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedThemeId) {
      setThemeId(savedThemeId);

      // 内联脚本已同步加载 CSS（<style id="sso-theme-style">），
      // 仅在未加载时异步补加载（兜底）
      const existingStyle = document.getElementById('sso-theme-style') as HTMLStyleElement | null;
      if (!existingStyle || existingStyle.dataset.theme !== savedThemeId) {
        switchTheme(savedThemeId);
      }
    }

    setMounted(true);
  }, []);

  // ---- 选择主题 ----
  const selectTheme = useCallback(async (id: string | null) => {
    setThemeId(id);

    if (id) {
      localStorage.setItem(THEME_STORAGE_KEY, id);
      await switchTheme(id);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
      await switchTheme(null);
    }
  }, []);

  // ---- 注册自定义主题 ----
  const registerTheme = useCallback((manifest: ThemeManifest) => {
    registerAndPersistTheme(manifest);
    setThemes(getAllThemes());
  }, []);

  // ---- 注销自定义主题 ----
  const unregisterTheme = useCallback((id: string) => {
    // 如果正在使用被删除的主题，先切换回默认
    if (themeId === id) {
      selectTheme(null);
    }
    unregisterAndPersistTheme(id);
    setThemes(getAllThemes());
  }, [themeId, selectTheme]);

  // ---- 重置为默认 ----
  const resetTheme = useCallback(() => {
    selectTheme(null);
  }, [selectTheme]);

  // 分离内置和自定义主题
  const customThemes = themes.filter((t) => !t.builtin);

  return {
    themeId,
    themes,
    customThemes,
    mounted,
    selectTheme,
    registerTheme,
    unregisterTheme,
    resetTheme,
  } as const;
}