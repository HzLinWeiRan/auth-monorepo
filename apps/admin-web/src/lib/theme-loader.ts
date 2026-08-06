/**
 * ThemeLoader — 主题 CSS 加载与作用域注入。
 *
 * 核心功能：
 * - loadTheme(themeId): fetch CSS 文件 → 作用域转换 → 注入 <style> 标签
 * - unloadTheme(): 移除当前注入的 <style> 标签
 * - switchTheme(themeId | null): 卸载旧主题 → 加载新主题 → 更新 <html> class
 *
 * CSS 作用域转换规则：
 *   :root { ... }  →  html.theme-{id} { ... }
 *   .dark { ... }  →  html.theme-{id}.dark { ... }
 *
 * 这使得主题 CSS 仅在其对应的 class 存在时生效，
 * 且特异性高于 globals.css 中的 :root/.dark 回退样式。
 */

import { getThemeById } from './theme-registry';

// ---- 注入的 <style> 标签 ID ----
const THEME_STYLE_ID = 'sso-theme-style';

// ---- CSS 缓存：避免重复 fetch ----
const cssCache = new Map<string, string>();

// ---- 当前激活的主题 ID ----
let currentThemeId: string | null = null;

/**
 * 获取当前激活的主题 ID。
 */
export function getCurrentThemeId(): string | null {
  return currentThemeId;
}

/**
 * 对 CSS 文本进行作用域转换。
 *
 * 将 :root 替换为 html.theme-{id}，将 .dark 替换为 html.theme-{id}.dark。
 * 这使得主题变量仅在对应的 class 存在时生效。
 */
function scopeCSS(css: string, themeId: string): string {
  const scopeSelector = `html.theme-${themeId}`;

  let scoped = css;

  // 替换 :root { ... } → html.theme-{id} { ... }
  // 注意：:root 可能出现在多个位置，需要全局替换
  scoped = scoped.replace(/:root\s*\{/g, `${scopeSelector} {`);

  // 替换 .dark { ... } → html.theme-{id}.dark { ... }
  // 使用负向前瞻避免匹配到 .dark 后面的非 { 字符
  scoped = scoped.replace(/\.dark\s*\{/g, `${scopeSelector}.dark {`);

  return scoped;
}

/**
 * 从 localStorage 加载自定义主题 CSS。
 */
function loadCustomCSS(themeId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`sso-custom-css-${themeId}`);
  } catch {
    return null;
  }
}

/**
 * 加载并注入主题 CSS。
 *
 * 支持两种来源：
 * - 内置主题：从 cssPath fetch CSS 文件
 * - 自定义主题：从 localStorage 读取 CSS
 *
 * 1. 根据 themeId 查找主题元数据
 * 2. 获取 CSS 内容（文件 fetch 或 localStorage）
 * 3. 对 CSS 进行作用域转换
 * 4. 注入为 <style> 标签
 */
export async function loadTheme(themeId: string): Promise<void> {
  const theme = getThemeById(themeId);
  if (!theme) {
    console.warn(`[ThemeLoader] 主题 "${themeId}" 未注册`);
    return;
  }

  try {
    // 获取 CSS 内容（优先使用缓存）
    let css: string;
    if (cssCache.has(themeId)) {
      css = cssCache.get(themeId)!;
    } else if (theme.cssPath) {
      // 内置主题：fetch CSS 文件
      const response = await fetch(theme.cssPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      css = await response.text();
      cssCache.set(themeId, css);
    } else {
      // 自定义主题：从 localStorage 读取
      const stored = loadCustomCSS(themeId);
      if (!stored) {
        throw new Error(`自定义主题 "${themeId}" 的 CSS 数据不存在`);
      }
      css = stored;
      cssCache.set(themeId, css);
    }

    // 作用域转换
    const scopedCSS = scopeCSS(css, themeId);

    // 注入 <style> 标签
    injectStyle(scopedCSS, themeId);

    currentThemeId = themeId;
  } catch (error) {
    console.error(`[ThemeLoader] 加载主题 "${themeId}" 失败:`, error);
    // 加载失败时回退到无主题状态
    unloadTheme();
  }
}

/**
 * 注入 CSS 到 <head> 中的 <style> 标签。
 */
function injectStyle(css: string, themeId: string): void {
  // 移除旧标签
  removeStyleTag();

  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;
  style.dataset.theme = themeId;
  style.textContent = css;

  document.head.appendChild(style);
}

/**
 * 移除注入的 <style> 标签。
 */
function removeStyleTag(): void {
  const existing = document.getElementById(THEME_STYLE_ID);
  if (existing) {
    existing.remove();
  }
}

/**
 * 卸载当前主题。
 * 移除 <style> 标签和 <html> 上的 theme class。
 */
export function unloadTheme(): void {
  removeStyleTag();

  if (currentThemeId) {
    document.documentElement.classList.remove(`theme-${currentThemeId}`);
    currentThemeId = null;
  }
}

/**
 * 切换主题。
 *
 * @param themeId - 目标主题 ID，null 表示恢复默认
 */
export async function switchTheme(themeId: string | null): Promise<void> {
  // 移除旧主题的 class
  if (currentThemeId) {
    document.documentElement.classList.remove(`theme-${currentThemeId}`);
  }

  // 移除旧 <style> 标签
  removeStyleTag();

  if (themeId === null) {
    currentThemeId = null;
    return;
  }

  // 添加新主题的 class
  document.documentElement.classList.add(`theme-${themeId}`);

  // 加载新主题 CSS
  await loadTheme(themeId);
}

/**
 * 同步设置主题 class（用于防闪烁脚本，在 CSS 加载前先设置 class）。
 * 这确保页面首次渲染时就有正确的 class，避免闪烁。
 */
export function setThemeClass(themeId: string | null): void {
  // 移除所有已有的 theme-* class
  const classList = document.documentElement.classList;
  const toRemove: string[] = [];
  classList.forEach((cls) => {
    if (cls.startsWith('theme-')) {
      toRemove.push(cls);
    }
  });
  toRemove.forEach((cls) => classList.remove(cls));

  // 添加新 class
  if (themeId) {
    classList.add(`theme-${themeId}`);
  }

  currentThemeId = themeId;
}

/**
 * 清除 CSS 缓存（用于开发调试）。
 */
export function clearThemeCache(): void {
  cssCache.clear();
}