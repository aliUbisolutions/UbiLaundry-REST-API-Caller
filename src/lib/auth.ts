import { SignJWT, jwtVerify } from 'jose';

const JWT_COOKIE = 'ubl-session';
const JWT_EXPIRY = '8h';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'ubilaundry-dev-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  sub: string; // user id — the only claim carried by the token.
  // Profile, allowedMethods, etc. are intentionally NOT stored here: they are
  // looked up fresh from the data store on every request (see proxy.ts and
  // /api/auth/me), so that an admin revoking or demoting a user takes effect
  // immediately instead of waiting for that user's token to expire.
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { JWT_COOKIE };
