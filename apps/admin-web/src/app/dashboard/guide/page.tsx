'use client';

import { Copy, Check, Key, Shield, Server, Code, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useState } from 'react';

// ---- 代码块组件 ----
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border bg-zinc-950 text-zinc-50">
      {language && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="text-xs text-zinc-400">{language}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---- 步骤组件 ----
function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {num}
      </div>
      <div className="flex-1 space-y-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ---- 端点卡片 ----
function EndpointCard({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Badge variant="secondary" className={methodColors[method] || ''}>
        {method}
      </Badge>
      <code className="text-sm font-mono">{path}</code>
      <span className="ml-auto text-sm text-muted-foreground">{desc}</span>
    </div>
  );
}

// ---- 代码示例切换 ----
function TabExample({ nodeJsExample, pythonExample }: { nodeJsExample: string; pythonExample: string }) {
  const [tab, setTab] = useState<'nodejs' | 'python'>('nodejs');

  return (
    <div>
      <div className="mb-4 flex gap-1">
        <Button
          variant={tab === 'nodejs' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('nodejs')}
        >
          Node.js
        </Button>
        <Button
          variant={tab === 'python' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('python')}
        >
          Python
        </Button>
      </div>
      {tab === 'nodejs' ? (
        <CodeBlock language="JavaScript" code={nodeJsExample} />
      ) : (
        <CodeBlock language="Python" code={pythonExample} />
      )}
    </div>
  );
}

export default function GuidePage() {
  const issuer = typeof window !== 'undefined' ? window.location.origin : 'https://your-sso.com';

  const nodeJsExample = `const crypto = require('crypto');

// ===== 配置 =====
const CLIENT_ID = 'your-app-id';
const CLIENT_SECRET = 'your-app-secret';
const REDIRECT_URI = 'https://your-app.com/callback';
const SSO_BASE = '${issuer}';

// ===== 步骤 1: 生成 PKCE 参数 =====
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// ===== 步骤 2: 构建授权 URL（前端跳转） =====
function buildAuthUrl() {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomBytes(16).toString('hex');

  // 存储 verifier 和 state 到 session（供回调时校验）
  // req.session.codeVerifier = verifier;
  // req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return \`\${SSO_BASE}/oauth/authorize?\${params}\`;
}

// ===== 步骤 3: 回调处理 —— 用 code 换 token =====
async function exchangeCode(code) {
  const response = await fetch(\`\${SSO_BASE}/api/v1/oauth/token\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      // code_verifier: req.session.codeVerifier, // PKCE
    }),
  });

  const data = await response.json();
  // data.access_token  — 访问令牌（Bearer Token）
  // data.id_token      — OIDC 身份令牌（JWT）
  // data.refresh_token — 刷新令牌（offline_access scope 时返回）
  return data;
}

// ===== 步骤 4: 获取用户信息 =====
async function getUserInfo(accessToken) {
  const response = await fetch(\`\${SSO_BASE}/api/v1/oauth/userinfo\`, {
    headers: { Authorization: \`Bearer \${accessToken}\` },
  });
  return response.json();
  // { sub, name, preferred_username, email, email_verified }
}`;

  const pythonExample = `import hashlib, base64, os, secrets
import requests
import urllib.parse

CLIENT_ID = 'your-app-id'
CLIENT_SECRET = 'your-app-secret'
REDIRECT_URI = 'https://your-app.com/callback'
SSO_BASE = '${issuer}'

# ===== 步骤 1: 生成 PKCE 参数 =====
def generate_code_verifier():
    return base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode()

def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()

# ===== 步骤 2: 构建授权 URL =====
verifier = generate_code_verifier()
challenge = generate_code_challenge(verifier)
state = secrets.token_hex(16)

params = urllib.parse.urlencode({
    'response_type': 'code',
    'client_id': CLIENT_ID,
    'redirect_uri': REDIRECT_URI,
    'scope': 'openid profile email',
    'state': state,
    'code_challenge': challenge,
    'code_challenge_method': 'S256',
})

auth_url = f'{SSO_BASE}/oauth/authorize?{params}'
print(f'请访问: {auth_url}')

# ===== 步骤 3: 用 code 换 token =====
def exchange_code(code):
    resp = requests.post(f'{SSO_BASE}/api/v1/oauth/token', json={
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'code_verifier': verifier,
    })
    return resp.json()

# ===== 步骤 4: 获取用户信息 =====
def get_user_info(access_token):
    resp = requests.get(f'{SSO_BASE}/api/v1/oauth/userinfo', headers={
        'Authorization': f'Bearer {access_token}',
    })
    return resp.json()`;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">企业接入教程</h2>
        <p className="mt-1 text-muted-foreground">
          按照以下步骤将您的应用接入统一身份认证平台，实现单点登录（SSO）
        </p>
      </div>

      {/* 前置条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            前置条件
          </CardTitle>
          <CardDescription>开始接入前，请确保您已完成以下准备工作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              1
            </div>
            <div>
              <p className="font-medium">在管理后台创建应用</p>
              <p className="text-sm text-muted-foreground">
                前往「应用管理」页面，点击「新建应用」，填写应用名称和回调地址。创建后会生成 <code className="rounded bg-muted px-1 text-xs">client_id</code> 和{' '}
                <code className="rounded bg-muted px-1 text-xs">client_secret</code>。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              2
            </div>
            <div>
              <p className="font-medium">配置回调地址</p>
              <p className="text-sm text-muted-foreground">
                在您的应用中实现一个回调端点（如 <code className="rounded bg-muted px-1 text-xs">/callback</code>），
                用于接收 SSO 返回的授权码（authorization code）。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              3
            </div>
            <div>
              <p className="font-medium">获取 SSO 平台地址</p>
              <p className="text-sm text-muted-foreground">
                当前 SSO 平台地址为 <code className="rounded bg-muted px-1 text-xs">{issuer}</code>，
                所有 OAuth 端点均基于此地址。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 接入流程 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            接入流程
          </CardTitle>
          <CardDescription>OAuth 2.0 Authorization Code Flow + PKCE</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Step num={1} title="用户发起登录">
            <p className="text-sm text-muted-foreground">
              当用户点击您应用中的「SSO 登录」按钮时，将用户浏览器重定向到 SSO 授权端点：
            </p>
            <CodeBlock
              language="HTTP"
              code={`GET /oauth/authorize?response_type=code
    &client_id={您的 client_id}
    &redirect_uri={回调地址}
    &scope=openid+profile+email
    &state={随机字符串}
    &code_challenge={PKCE challenge}
    &code_challenge_method=S256`}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>安全提示：</strong>强烈建议使用 PKCE（S256）防止授权码拦截攻击。state 参数用于防 CSRF，回调时务必校验。
              </p>
            </div>
          </Step>

          <Step num={2} title="用户在 SSO 登录页完成认证">
            <p className="text-sm text-muted-foreground">
              用户将被重定向到 SSO 平台的品牌化登录页面。登录页会根据您应用的 <code className="rounded bg-muted px-1 text-xs">client_id</code> 自动展示
              对应的 Logo、品牌色和应用名称。
            </p>
            <p className="text-sm text-muted-foreground">
              用户输入账号密码完成认证后，SSO 会将浏览器重定向回您指定的 <code className="rounded bg-muted px-1 text-xs">redirect_uri</code>，
              并在 URL 中附带授权码和 state：
            </p>
            <CodeBlock
              language="HTTP"
              code={`GET {redirect_uri}?code={authorization_code}&state={state}`}
            />
          </Step>

          <Step num={3} title="后端用授权码换取 Token">
            <p className="text-sm text-muted-foreground">
              您的后端服务收到回调后，用授权码调用 Token 端点换取访问令牌：
            </p>
            <CodeBlock
              language="HTTP"
              code={`POST /api/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "{回调中收到的 code}",
  "client_id": "{您的 client_id}",
  "client_secret": "{您的 client_secret}",
  "redirect_uri": "{注册的回调地址}",
  "code_verifier": "{PKCE verifier}"
}`}
            />
            <p className="text-sm text-muted-foreground">成功响应示例：</p>
            <CodeBlock
              language="JSON"
              code={`{
  "access_token": "eyJhbG...",    // 访问令牌，Bearer Token
  "token_type": "Bearer",
  "expires_in": 3600,             // 有效期（秒）
  "id_token": "eyJhbG...",        // OIDC 身份令牌（JWT）
  "refresh_token": "rt_...",      // 刷新令牌（需 scope=offline_access）
  "scope": "openid profile email"
}`}
            />
          </Step>

          <Step num={4} title="获取用户信息">
            <p className="text-sm text-muted-foreground">
              使用 access_token 调用 UserInfo 端点获取当前登录用户的身份信息：
            </p>
            <CodeBlock
              language="HTTP"
              code={`GET /api/v1/oauth/userinfo
Authorization: Bearer {access_token}`}
            />
            <p className="text-sm text-muted-foreground">响应示例：</p>
            <CodeBlock
              language="JSON"
              code={`{
  "sub": "user-uuid",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "email_verified": true
}`}
            />
          </Step>
        </CardContent>
      </Card>

      {/* API 端点速查 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API 端点速查
          </CardTitle>
          <CardDescription>完整的 OAuth 2.0 / OIDC 标准端点</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <EndpointCard method="GET" path="/.well-known/openid-configuration" desc="OIDC Discovery" />
          <EndpointCard method="GET" path="/oauth/authorize" desc="授权端点（浏览器）" />
          <EndpointCard method="POST" path="/api/v1/oauth/token" desc="令牌端点" />
          <EndpointCard method="GET" path="/api/v1/oauth/userinfo" desc="用户信息" />
          <EndpointCard method="POST" path="/api/v1/oauth/introspect" desc="令牌校验" />
          <EndpointCard method="POST" path="/api/v1/oauth/revoke" desc="令牌吊销" />
          <EndpointCard method="GET" path="/oauth/endsession" desc="统一登出" />
        </CardContent>
      </Card>

      {/* 代码示例 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            代码示例
          </CardTitle>
          <CardDescription>选择您的技术栈查看完整接入示例</CardDescription>
        </CardHeader>
        <CardContent>
          <TabExample nodeJsExample={nodeJsExample} pythonExample={pythonExample} />
        </CardContent>
      </Card>

      {/* 常见问题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            常见问题
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">如何让用户在多个应用间保持登录状态？</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              SSO 平台使用全局会话机制。用户在一个应用中登录后，访问其他已接入的应用时无需再次输入密码，
              浏览器会自动携带 SSO Cookie 完成免登录认证。
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">access_token 过期了怎么办？</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              请求 Token 时添加 <code className="rounded bg-muted px-1 text-xs">scope=offline_access</code>，
              会同时返回 <code className="rounded bg-muted px-1 text-xs">refresh_token</code>。
              之后用 refresh_token 调用 Token 端点即可获取新的 access_token。
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">如何实现统一登出？</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              将用户重定向到 <code className="rounded bg-muted px-1 text-xs">/oauth/endsession?id_token_hint=xxx</code>，
              SSO 会清除全局会话并回调 <code className="rounded bg-muted px-1 text-xs">post_logout_redirect_uri</code>。
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium">登录页的品牌如何自定义？</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              在「应用管理」中编辑您的应用，可设置 Logo、品牌主色。登录页会根据 client_id 自动渲染对应的品牌样式。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}