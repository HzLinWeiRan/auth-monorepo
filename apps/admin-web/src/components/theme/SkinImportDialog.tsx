/**
 * SkinImportDialog — 第三方主题导入对话框。
 *
 * 支持两种导入方式：
 * 1. 从 tweakcn.com URL 自动获取（需后端代理或 CORS 支持）
 * 2. 手动粘贴 CSS 代码
 *
 * 导入后通过 theme-registry 注册主题，可立即切换使用。
 */

'use client';

import { useState } from 'react';
import { Loader2, Link, FileCode, Check, Trash2, ExternalLink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ThemeManifest } from '@/lib/theme-registry';
import { useThemeConfigContext } from './ThemeProvider';

/**
 * 从 tweakcn.com URL 中提取主题数据。
 * 由于可能的 CORS 限制，失败时提示用户手动粘贴。
 */
async function fetchTweakcnTheme(url: string): Promise<{ name: string; css: string }> {
  const themeIdMatch = url.match(/\/theme\/([a-zA-Z0-9_-]+)/);
  const themeId = themeIdMatch?.[1] ?? `tweakcn-${Date.now()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();

    // 解析 HTML 中的 CSS 变量
    const css = extractCSSFromHTML(html);
    if (!css) {
      throw new Error('未找到有效的 CSS 变量定义');
    }

    return { name: `TweakCN - ${themeId}`, css };
  } catch (error) {
    throw new Error(
      `无法自动获取皮肤数据。请访问 ${url} 并手动复制 CSS 代码。`
    );
  }
}

function extractCSSFromHTML(html: string): string {
  // 提取 <style> 标签内容
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const matches = [...html.matchAll(styleRegex)];
  if (matches.length > 0) {
    return matches.map((m) => m[1]).join('\n');
  }
  return '';
}

/**
 * 从原始 CSS 文本中解析出主题名称和主色调。
 */
function parseCSSInfo(css: string): { name: string; previewColor: string } {
  // 尝试从注释中提取主题名
  const nameMatch = css.match(/\/\*\s*Theme:\s*(.+?)\s*\*\//);
  const name = nameMatch?.[1] ?? `自定义主题 ${Date.now()}`;

  // 提取 primary 颜色作为预览色
  const primaryMatch = css.match(/--primary:\s*(.+?);/);
  const previewColor = primaryMatch?.[1]?.trim() ?? 'oklch(0.546 0.245 262.881)';

  return { name, previewColor };
}

export function SkinImportDialog() {
  const config = useThemeConfigContext();
  const [open, setOpen] = useState(false);

  // ---- 导入状态 ----
  const [url, setUrl] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<'url' | 'css'>('url');

  if (!config) return null;

  const { themeId, customThemes, selectTheme, registerTheme, unregisterTheme } = config;

  const handleImportFromUrl = async () => {
    if (!url.trim()) {
      toast.error('请输入有效的 URL');
      return;
    }

    setImporting(true);
    try {
      const { name, css } = await fetchTweakcnTheme(url.trim());
      const { previewColor } = parseCSSInfo(css);
      const id = `custom-${Date.now()}`;

      const manifest: ThemeManifest = {
        id,
        name,
        description: `从 ${url.trim()} 导入`,
        cssPath: '', // 自定义主题不使用文件路径，CSS 直接保存
        builtin: false,
        previewColor,
      };

      // 保存 CSS 到 localStorage
      saveCustomCSS(id, css);
      registerTheme(manifest);
      selectTheme(id);

      toast.success('主题导入成功', {
        description: `已应用 "${name}"`,
      });
      setOpen(false);
      setUrl('');
    } catch (err: any) {
      toast.error('自动获取失败', {
        description: err?.message || '请尝试手动粘贴 CSS 代码',
      });
      setMode('css');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromCSS = () => {
    if (!cssCode.trim()) {
      toast.error('请输入 CSS 代码');
      return;
    }

    try {
      const css = cssCode.trim();
      const { name, previewColor } = parseCSSInfo(css);
      const id = `custom-${Date.now()}`;

      const manifest: ThemeManifest = {
        id,
        name,
        description: '自定义 CSS 主题',
        cssPath: '',
        builtin: false,
        previewColor,
      };

      saveCustomCSS(id, css);
      registerTheme(manifest);
      selectTheme(id);

      toast.success('主题导入成功', {
        description: '已应用自定义主题',
      });
      setOpen(false);
      setCssCode('');
    } catch (err: any) {
      toast.error('CSS 解析失败', {
        description: err?.message || '请检查 CSS 代码格式',
      });
    }
  };

  const handleActivateSkin = (id: string) => {
    selectTheme(id);
    const theme = customThemes.find((t) => t.id === id);
    toast.success('主题已切换', {
      description: theme ? `已应用 "${theme.name}"` : undefined,
    });
  };

  const handleDeleteSkin = (id: string) => {
    removeCustomCSS(id);
    unregisterTheme(id);
    toast.success('主题已删除');
  };

  const isActiveSkin = (skinId: string) => themeId === skinId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-9 w-9 transition-all duration-300',
          customThemes.length > 0 && themeId && customThemes.some(t => t.id === themeId) && 'text-primary',
          'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <FileCode
          className={cn(
            'h-[1.2rem] w-[1.2rem] transition-all duration-500',
            customThemes.length > 0 && themeId && customThemes.some(t => t.id === themeId) && 'fill-primary/20'
          )}
        />
        <span className="sr-only">导入第三方主题</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入第三方主题</DialogTitle>
          <DialogDescription>
            从 tweakcn.com 或其他来源导入主题 CSS 配置
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 导入方式切换 */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('url')}
            >
              <Link className="mr-1.5 h-3.5 w-3.5" />
              URL 导入
            </Button>
            <Button
              variant={mode === 'css' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('css')}
            >
              <FileCode className="mr-1.5 h-3.5 w-3.5" />
              CSS 粘贴
            </Button>
          </div>

          {/* URL 导入 */}
          {mode === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="skin-url">tweakcn.com 主题链接</Label>
                <div className="flex gap-2">
                  <Input
                    id="skin-url"
                    placeholder="https://tweakcn.com/editor/theme/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
                  />
                  <Button
                    onClick={handleImportFromUrl}
                    disabled={importing || !url.trim()}
                  >
                    {importing ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    导入
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                访问{' '}
                <a
                  href="https://tweakcn.com/editor/theme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-primary"
                >
                  tweakcn.com
                  <ExternalLink className="h-3 w-3" />
                </a>
                {' '}创建您的专属主题
              </p>
            </div>
          )}

          {/* CSS 粘贴 */}
          {mode === 'css' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="skin-css">粘贴 CSS 代码</Label>
                <textarea
                  id="skin-css"
                  className={cn(
                    'flex w-full min-h-[120px] rounded-md border border-input',
                    'bg-background px-3 py-2 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'font-mono text-xs'
                  )}
                  placeholder={`粘贴 CSS 代码...\n\n示例：\n/* Theme: 我的主题 */\n:root {\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.145 0 0);\n  ...\n}\n.dark {\n  --background: oklch(0.145 0 0);\n  ...\n}`}
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleImportFromCSS}
                disabled={!cssCode.trim()}
                className="w-full"
              >
                <FileCode className="mr-1.5 h-4 w-4" />
                解析并导入
              </Button>
            </div>
          )}

          {/* 已保存的自定义主题列表 */}
          {customThemes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  已导入的主题 ({customThemes.length})
                </Label>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {customThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2',
                        'border border-transparent',
                        isActiveSkin(theme.id) && 'border-primary/30 bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">
                          {theme.name}
                        </span>
                        {isActiveSkin(theme.id) && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                            当前
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isActiveSkin(theme.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleActivateSkin(theme.id)}
                          >
                            应用
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSkin(theme.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- 自定义主题 CSS 持久化 ----

const CUSTOM_CSS_PREFIX = 'sso-custom-css-';

function saveCustomCSS(id: string, css: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CUSTOM_CSS_PREFIX}${id}`, css);
  } catch {
    // 忽略存储错误
  }
}

function removeCustomCSS(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CUSTOM_CSS_PREFIX}${id}`);
  } catch {
    // 忽略
  }
}

export function getCustomCSS(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${CUSTOM_CSS_PREFIX}${id}`);
  } catch {
    return null;
  }
}