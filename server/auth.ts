import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from './db.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SECRET;
}

export function getEnvAdminPasscode(): string | null {
  const passcode = process.env.ADMIN_PASSCODE?.trim();
  return passcode && passcode.length > 0 ? passcode : null;
}

async function getStoredAdminHash(): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT password_hash FROM admin_settings WHERE id = 1'
  );
  return (rows[0]?.password_hash as string | undefined) ?? null;
}

export async function getAdminAuthStatus(): Promise<{
  needsSetup: boolean;
  usesEnvPasscode: boolean;
}> {
  const envPasscode = getEnvAdminPasscode();
  if (envPasscode) {
    return { needsSetup: false, usesEnvPasscode: true };
  }
  const storedHash = await getStoredAdminHash();
  return { needsSetup: !storedHash, usesEnvPasscode: false };
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordScrypt(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, expectedHex] = parts;
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function claimInitialAdminPassword(password: string): Promise<boolean> {
  if (getEnvAdminPasscode()) {
    return false;
  }
  const hash = hashPasswordScrypt(password);
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT IGNORE INTO admin_settings (id, password_hash) VALUES (1, ?)',
    [hash]
  );
  return result.affectedRows === 1;
}

export async function verifyAdminCredentials(password: string): Promise<boolean> {
  const envPasscode = getEnvAdminPasscode();
  if (envPasscode) {
    return timingSafeStringEqual(password, envPasscode);
  }
  const storedHash = await getStoredAdminHash();
  if (!storedHash) {
    return false;
  }
  return verifyPasswordScrypt(password, storedHash);
}

interface TokenPayload {
  role: 'admin';
  exp: number;
  nonce: string;
}

export function issueAdminToken(): string {
  const payload: TokenPayload = {
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TokenPayload;
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Administrator authentication required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  next();
}