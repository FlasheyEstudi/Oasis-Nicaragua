// OASIS - Auth Logout API Route
// POST /api/v1/auth/logout - Secure logout revoking refresh tokens

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/utils/api-response';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get('refresh_token')?.value;
    if (!token) {
      try { token = (await req.json()).refresh_token; } catch {}
    }

    if (token) {
      await authService.revokeToken(token);
    }
  } catch {}

  const response = successResponse(null, 'Sesión cerrada con éxito');
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0
  });

  return response;
}
