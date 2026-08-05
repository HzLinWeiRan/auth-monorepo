/** 应用（SP）信息 */
export interface AppInfo {
  id: string;
  appId: string;
  name: string;
  redirectUri: string;
  logoutCallbackUrl?: string;
  applicationType: string;
  tokenEndpointAuthMethod: string;
  status?: string;
  enterpriseId?: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}