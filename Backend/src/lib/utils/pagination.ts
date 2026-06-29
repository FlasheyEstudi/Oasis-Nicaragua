export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parsea y estandariza los parámetros de paginación desde URLSearchParams con valores por defecto
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
