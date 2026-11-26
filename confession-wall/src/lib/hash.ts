import crypto from 'crypto';

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return '127.0.0.1';
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-dev-ip-hash-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${ip}`)
    .digest('hex');
}
