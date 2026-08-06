/**
 * ThemeScript — 防闪烁内联脚本。
 *
 * 在 <head> 中注入同步脚本，在 React 水合前设置主题 class。
 * 原理：
 * 1. 从 localStorage 读取 sso-theme-id
 * 2. 立即设置 document.documentElement 的 theme-{id} class
 * 3. 避免页面渲染后主题切换导致的闪烁
 *
 * 此组件必须在 <html> 内、<body> 之前渲染。
 */

/**
 * 内联脚本的原始代码。
 * 不能使用任何外部依赖，必须是纯 JavaScript。
 */
const scriptContent = `
(function() {
  try {
    var id = localStorage.getItem('sso-theme-id');
    if (id) {
      document.documentElement.classList.add('theme-' + id);
    }
  } catch (e) {
    // localStorage 不可用时静默失败
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}