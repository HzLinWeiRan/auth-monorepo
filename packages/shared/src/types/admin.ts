/** 管理后台用户信息 */
export interface AdminUser {
  id: string;
  username: string;
  enterpriseId?: string;
  roles?: string;
}

/** 管理后台登录响应 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminUser;
}

/** 系统概览数据 */
export interface OverviewData {
  enterpriseCount: number;
  appCount: number;
  totalUserCount: number;
  timestamp: string;
}