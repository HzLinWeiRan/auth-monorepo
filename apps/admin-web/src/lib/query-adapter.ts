/**
 * 适配 @hey-api/client-fetch 的 `{ data, error }` 返回模式到 react-query 的异常抛出模式。
 *
 * 生成的 SDK 函数默认返回 `{ data, error }`（throwOnError: false）。
 * React Query 期望 queryFn/mutationFn 要么返回数据，要么抛出异常。
 */
export async function unwrapResult<T>(
  promise: Promise<{ data?: T; error?: unknown }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw error;
  }
  return data as T;
}