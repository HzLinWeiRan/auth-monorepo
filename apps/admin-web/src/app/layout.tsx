import type { Metadata } from 'next';
import { QueryProvider } from '@/components/QueryProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProviderWrapper } from '@/components/theme/ThemeProviderWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSO 管理后台',
  description: '统一身份认证中心管理后台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 防闪烁脚本：同步加载主题 CSS，在首帧渲染前完成 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var id = localStorage.getItem('sso-theme-id');
    if (!id) return;

    var root = document.documentElement;

    // 1. 立即设置 class（防止 CSS 选择器不匹配）
    root.classList.add('theme-' + id);

    // 2. 同步加载 CSS 文件（阻塞但避免闪烁，文件 < 5KB）
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/themes/' + id + '.css', false);
    xhr.send();

    if (xhr.status === 200) {
      var css = xhr.responseText;

      // 3. CSS 作用域转换
      css = css.replace(/:root\\s*\\{/g, 'html.theme-' + id + ' {');
      css = css.replace(/\\.dark\\s*\\{/g, 'html.theme-' + id + '.dark {');

      // 4. 注入 <style> 标签
      var style = document.createElement('style');
      style.id = 'sso-theme-style';
      style.dataset.theme = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (e) {}
})();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProviderWrapper>
          <QueryProvider>
            <TooltipProvider delay={200}>
              {children}
            </TooltipProvider>
          </QueryProvider>
          <Toaster position="top-center" />
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}