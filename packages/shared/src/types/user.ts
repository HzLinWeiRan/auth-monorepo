/** 用户信息 */
export interface User {
  id: string;
  username: string;
  email?: string;
  /** 是否已软删除 */
  isDeleted: boolean;
  /** 是否已启用 */
  isEnabled: boolean;
  enterpriseId?: string;
  roles: string;
  createdAt: string;
  updatedAt: string;
}