/** 应用（SP）信息 */
export interface AppInfo {
  id: string;
  appId: string;
  secret?: string;
  name: string;
  redirectUri: string;
  logoutCallbackUrl?: string;
  applicationType: string;
  tokenEndpointAuthMethod: string;
  enterpriseId?: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}