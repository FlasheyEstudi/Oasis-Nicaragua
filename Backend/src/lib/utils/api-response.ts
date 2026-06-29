import { NextResponse } from 'next/server';

/**
 * Success response format: { ok: true, data: T, message: "..." }
 */
export function successResponse<T>(data: T, message = 'Operación exitosa', status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Error response format: { ok: false, error: { code: "...", message: "...", details: ... } }
 */
export function errorResponse(code: string, message: string, details?: any, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details || null,
      },
    },
    { status }
  );
}

/**
 * Paginated response format
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status = 200
) {
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json(
    {
      ok: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    { status }
  );
}

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_INACTIVE: 'USER_INACTIVE',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PRESCRIPTION_EXPIRED: 'PRESCRIPTION_EXPIRED',
  PRESCRIPTION_CANCELLED: 'PRESCRIPTION_CANCELLED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  RATE_LIMITED: 'RATE_LIMITED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID: 'TWO_FACTOR_INVALID',
} as const;
