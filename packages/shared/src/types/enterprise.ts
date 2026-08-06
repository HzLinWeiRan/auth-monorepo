/** 企业/租户信息 */
export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  /** 是否已软删除 */
  isDeleted: boolean;
  /** 是否已启用 */
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}