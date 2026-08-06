/**
 * ThemeRegistry — 主题注册表。
 *
 * 管理所有可用主题的元数据，包括内置主题和用户注册的自定义主题。
 * 内置主题对应 public/themes/ 目录下的 CSS 文件。
 *
 * 注册表 API：
 * - getBuiltinThemes(): 获取内置主题列表
 * - registerTheme(manifest): 注册自定义主题
 * - unregisterTheme(id): 注销主题
 * - getThemeById(id): 按 ID 查找主题
 * - getAllThemes(): 获取所有已注册主题
 */

export interface ThemeManifest {
  /** 唯一标识，对应 CSS 文件名（不含扩展名），如 "blue" */
  id: string;
  /** 显示名称，如 "专业蓝" */
  name: string;
  /** 描述文本 */
  description: string;
  /** CSS 文件路径，如 "/themes/blue.css" */
  cssPath: string;
  /** 是否内置主题 */
  builtin: boolean;
  /** 预览色（primary 颜色，用于色块展示） */
  previewColor?: string;
}

// ---- 内置主题清单 ----
const BUILTIN_THEMES: ThemeManifest[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: '温暖中性色调，Claude 风格',
    cssPath: '/themes/claude.css',
    builtin: true,
    previewColor: 'oklch(0.6171 0.1375 39.0427)',
  },
  {
    id: 't3-chat',
    name: 'T3 Chat',
    description: 'T3 Chat 风格暗色主题 — 来自 tweakcn.com',
    cssPath: '/themes/t3-chat.css',
    builtin: true,
    previewColor: 'hsl(332.0245 100% 31.9608%)',
  },
];

// ---- 自定义主题注册表 ----
const customThemes: Map<string, ThemeManifest> = new Map();

/**
 * 获取内置主题列表。
 */
export function getBuiltinThemes(): ThemeManifest[] {
  return BUILTIN_THEMES;
}

/**
 * 注册一个自定义主题。
 * 如果同 ID 已存在，则覆盖。
 */
export function registerTheme(manifest: ThemeManifest): void {
  customThemes.set(manifest.id, { ...manifest, builtin: false });
}

/**
 * 注销一个自定义主题。
 */
export function unregisterTheme(id: string): void {
  customThemes.delete(id);
}

/**
 * 按 ID 查找主题（先查内置，再查自定义）。
 */
export function getThemeById(id: string): ThemeManifest | undefined {
  const builtin = BUILTIN_THEMES.find((t) => t.id === id);
  if (builtin) return builtin;
  return customThemes.get(id);
}

/**
 * 获取所有已注册主题（内置 + 自定义）。
 * 内置主题在前，自定义主题在后。
 */
export function getAllThemes(): ThemeManifest[] {
  return [...BUILTIN_THEMES, ...customThemes.values()];
}

/**
 * 检查主题 ID 是否有效。
 */
export function isValidThemeId(id: string): boolean {
  return getThemeById(id) !== undefined;
}

// ---- 持久化：自定义主题保存到 localStorage ----

const CUSTOM_THEMES_STORAGE_KEY = 'sso-custom-themes';

/**
 * 从 localStorage 恢复自定义主题。
 */
export function loadCustomThemes(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return;
    const themes: ThemeManifest[] = JSON.parse(raw);
    for (const theme of themes) {
      customThemes.set(theme.id, theme);
    }
  } catch {
    // 忽略解析错误
  }
}

/**
 * 将自定义主题持久化到 localStorage。
 */
function persistCustomThemes(): void {
  if (typeof window === 'undefined') return;
  try {
    const themes = Array.from(customThemes.values());
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 注册并持久化自定义主题。
 */
export function registerAndPersistTheme(manifest: ThemeManifest): void {
  registerTheme(manifest);
  persistCustomThemes();
}

/**
 * 注销并持久化。
 */
export function unregisterAndPersistTheme(id: string): void {
  unregisterTheme(id);
  persistCustomThemes();
}