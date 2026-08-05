/** 统一成功响应封装 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

/** 分页数据包装 */
export interface PagedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}