import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

if (!process.env.JWT_SECRET_CLIENT) throw new Error('JWT_SECRET_CLIENT env var is required (min 32 chars)');
if (!process.env.JWT_SECRET_ADMIN) throw new Error('JWT_SECRET_ADMIN env var is required (min 32 chars)');
if (!process.env.REFRESH_SECRET) throw new Error('REFRESH_SECRET env var is required (min 32 chars)');

const CLIENT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_CLIENT);
const ADMIN_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_ADMIN);
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET);

const ACCESS_EXPIRY = '15m';
const ADMIN_ACCESS_EXPIRY = '30m';
const REFRESH_EXPIRY = '7d';
const ADMIN_REFRESH_EXPIRY = '1d';

export async function generateAccessToken(userId, type = 'client') {
  const secret = type === 'admin' ? ADMIN_SECRET : CLIENT_SECRET;
  const expiry = type === 'admin' ? ADMIN_ACCESS_EXPIRY : ACCESS_EXPIRY;
  return await new SignJWT({ sub: userId, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer('dutchkem-prosuite')
    .sign(secret);
}

export async function generateRefreshToken(userId, type = 'client') {
  const expiry = type === 'admin' ? ADMIN_REFRESH_EXPIRY : REFRESH_EXPIRY;
  return await new SignJWT({ sub: userId, type, purpose: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer('dutchkem-prosuite')
    .sign(REFRESH_SECRET);
}

export async function generateTempToken(userId, minutes = 5) {
  return await new SignJWT({ sub: userId, purpose: '2fa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .setIssuer('dutchkem-prosuite')
    .sign(CLIENT_SECRET);
}

export async function generateResetToken(email, minutes = 15) {
  return await new SignJWT({ sub: email, purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .setIssuer('dutchkem-prosuite')
    .sign(CLIENT_SECRET);
}

export async function verifyAccessToken(token, type = 'client') {
  const secret = type === 'admin' ? ADMIN_SECRET : CLIENT_SECRET;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'dutchkem-prosuite' });
    return payload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token) {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, { issuer: 'dutchkem-prosuite' });
    if (payload.purpose !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyTempToken(token) {
  try {
    const { payload } = await jwtVerify(token, CLIENT_SECRET, { issuer: 'dutchkem-prosuite' });
    if (payload.purpose !== '2fa') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyResetToken(token) {
  try {
    const { payload } = await jwtVerify(token, CLIENT_SECRET, { issuer: 'dutchkem-prosuite' });
    if (payload.purpose !== 'password_reset') return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}

export function parseUserAgent(userAgent = '') {
  const ua = userAgent.toLowerCase();
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { browser, os };
}
