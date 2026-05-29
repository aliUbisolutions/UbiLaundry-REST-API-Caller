import { SignJWT, jwtVerify } from 'jose';

const JWT_COOKIE = 'ubl-session';
const JWT_EXPIRY = '8h';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'ubilaundry-dev-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  sub: string;       // user id
  username: string;
  profile: 'admin' | 'user';
  allowedMethods: string[];
  serverEnvAccess: string[] | 'all';
  allowedEndpoints: string[] | 'all';
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
