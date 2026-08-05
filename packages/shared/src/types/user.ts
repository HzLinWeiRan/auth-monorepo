/** 用户信息 */
export interface User {
  id: string;
  username: string;
  email?: string;
  status: string;
  enterpriseId?: string;
  roles: string;
  createdAt: string;
  updatedAt: string;
}