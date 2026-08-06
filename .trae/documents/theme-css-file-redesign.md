# 主题系统 CSS 文件化重构方案

## Context

当前主题系统使用 JS 对象（`theme-presets.ts`）存储主题变量，通过动态注入 `<style>` 标签覆盖 CSS 变量。这种方式存在以下问题：
- 新增主题需要修改 TS 代码，无法通过简单添加 CSS 文件实现
- 主题变量与代码耦合，不利于非开发人员维护
- 皮肤导入功能（`theme-skin.ts`）与预设主题使用两套不同的机制

用户要求重构为 **CSS 文件驱动** 的主题系统：只需在 `public/themes/` 目录下放置 CSS 文件即可注册新主题，切换时在 `<html>` 上添加对应 class 使主题生效。

## 架构设计

### 核心机制

```
public/themes/
  default.css       ← 内置：默认中性
  blue.css          ← 内置：专业蓝
  green.css         ← 内置：清新绿
  purple.css        ← 内置：创意紫
  orange.css        ← 内置：活力橙
  dark-slate.css    ← 内置：暗夜Slate
  {custom}.css      ← 用户可自由添加
```

每个 CSS 文件标准格式：
```css
/* Theme: 主题名称 */
/* Description: 主题描述 */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... 所有 shadcn 变量 */
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... 深色模式覆盖 */
}
```

### CSS 作用域机制

加载主题时，系统将 CSS 选择器进行作用域转换：

| 原始选择器 | 转换后选择器 |
|-----------|-------------|
| `:root { }` | `html.theme-{name} { }` |
| `.dark { }` | `html.theme-{name}.dark { }` |

- `html.theme-{name}` 特异性 (0,0,1,1) 高于 `:root` (0,0,1,0)，确保主题变量覆盖默认值
- `next-themes` 继续管理 `dark` class，两者共存：`<html class="theme-blue dark">`
- `globals.css` 中的 `:root`/`.dark` 块保留作为**回退默认主题**

### 组件层级

```
layout.tsx (Server Component)
  └─ ThemeScript (inline <script> 防闪烁)
  └─ ThemeProviderWrapper (Client Component)
       └─ ThemeProvider (next-themes + ThemeConfigContext)
            └─ 应用内容
```

### 防闪烁策略

内联 `<script>` 在 `<head>` 中同步执行，在 React 水合前：
1. 从 `localStorage` 读取 `sso-theme-id`
2. 设置 `document.documentElement.className` 添加 `theme-{id}` class
3. 避免页面渲染后主题切换导致的闪烁

## 实现步骤

### Step 1: 创建主题 CSS 文件

在 `public/themes/` 下创建 6 个内置主题 CSS 文件。CSS 变量值从现有 `theme-presets.ts` 迁移，格式从 HSL 转为 oklch（与 `globals.css` 保持一致）。

- `public/themes/default.css`
- `public/themes/blue.css`
- `public/themes/green.css`
- `public/themes/purple.css`
- `public/themes/orange.css`
- `public/themes/dark-slate.css`

### Step 2: 创建主题注册表 `src/lib/theme-registry.ts`

```typescript
interface ThemeManifest {
  id: string;          // 唯一标识，如 "blue"
  name: string;        // 显示名称，如 "专业蓝"
  description: string; // 描述文本
  cssPath: string;     // CSS 文件路径，如 "/themes/blue.css"
  builtin: boolean;    // 是否内置
}

// 内置主题清单
const BUILTIN_THEMES: ThemeManifest[] = [...];

// 注册表 API
getBuiltinThemes(): ThemeManifest[]
registerTheme(manifest: ThemeManifest): void
unregisterTheme(id: string): void
getThemeById(id: string): ThemeManifest | undefined
getAllThemes(): ThemeManifest[]
```

### Step 3: 创建主题加载器 `src/lib/theme-loader.ts`

核心功能：
- `loadTheme(themeId: string)`: fetch CSS → scope → inject `<style>`
- `unloadTheme()`: 移除当前 `<style>` 标签
- `switchTheme(themeId: string | null)`: 卸载当前 → 加载新主题 → 更新 `<html>` class
- CSS 缓存（Map），避免重复 fetch
- CSS 作用域转换：`:root` → `html.theme-{id}`，`.dark` → `html.theme-{id}.dark`

### Step 4: 创建防闪烁脚本 `src/components/theme/ThemeScript.tsx`

内联 `<script>` 组件，在 `<head>` 中同步执行：
- 读取 `localStorage` 中的 `sso-theme-id`
- 设置 `document.documentElement` 的 class

### Step 5: 重构 `src/hooks/use-theme-config.ts`

简化为：
- 管理 `themeId` 状态（当前激活的主题 ID）
- 调用 `theme-loader` 的 `switchTheme` 进行切换
- 持久化到 `localStorage`
- 移除预设变量注入、皮肤管理等旧逻辑

### Step 6: 更新 `src/components/theme/ThemeProvider.tsx`

- 保持 `next-themes` 的 `ThemeProvider` 包裹
- 更新 `ThemeConfigContext` 传递新的配置结构
- 添加 `ThemeScript` 到 `<head>`

### Step 7: 更新 `src/components/theme/ThemeProviderWrapper.tsx`

适配新的 `useThemeConfig` hook 接口。

### Step 8: 重构 `src/components/theme/ThemeCustomizer.tsx`

- 从 `theme-registry` 获取主题列表（替代 `theme-presets`）
- 使用新的 `selectTheme` / `themeId` API

### Step 9: 更新 `src/app/globals.css`

- 保留 `@import`、`@theme inline`、`@layer base` 部分
- 保留 `:root` 和 `.dark` 块作为回退默认值
- 移除文件末尾的过渡选择器块（移到主题 CSS 文件或保留在全局）

### Step 10: 更新 `src/app/layout.tsx`

- 添加 `ThemeScript` 组件

### Step 11: 更新 `src/components/theme/SkinImportDialog.tsx`

- 适配新的主题注册 API
- 导入的 CSS 保存到 `localStorage`，通过 `registerTheme` 注册

### Step 12: 清理旧文件

- 删除 `src/lib/theme-presets.ts`（主题数据已迁移到 CSS 文件）
- 删除 `src/lib/theme-skin.ts`（皮肤功能合并到 registry + loader）
- 更新 `src/components/theme/index.ts` 导出

## 验证方案

1. **TypeScript 编译**: `cd apps/admin-web && npx tsc --noEmit` 零错误
2. **Next.js 构建**: `npm run build:admin` 构建成功
3. **服务启动**: `npm run dev:admin` 启动后访问 `http://localhost:3001`
4. **功能验证**:
   - 默认主题正常渲染
   - 切换到各预设主题，颜色正确变化
   - 切换 light/dark 模式，深色变量正确覆盖
   - 主题切换过程平滑无闪烁
   - 刷新页面后主题保持
   - 添加自定义 CSS 文件到 `public/themes/` 后可在 UI 中选择
5. **浏览器控制台**: 无报错