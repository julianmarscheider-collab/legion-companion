import { db } from '../data/db';
import { newId } from '../data/repositories';
import { seedSampleData } from '../data/seed';

export interface User {
  id: string;
  username: string;
}

/**
 * Account interface. The local implementation below stores accounts in the
 * browser database. For online accounts, implement this with your backend's
 * auth (e.g. Supabase Auth or Firebase Auth) and swap the export.
 */
export interface AuthService {
  currentUser(): Promise<User | null>;
  signUp(username: string, password: string): Promise<User>;
  signIn(username: string, password: string): Promise<User>;
  signOut(): Promise<void>;
}

const SESSION_KEY = 'tc.session';

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 }, key, 256);
  return toHex(bits);
}

class LocalAuthService implements AuthService {
  async currentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const rec = await db.users.get(id);
    return rec ? { id: rec.id, username: rec.username } : null;
  }

  async signUp(username: string, password: string) {
    username = username.trim();
    if (username.length < 3) throw new Error('Username must be at least 3 characters.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (await db.users.where('username').equalsIgnoreCase(username).first()) throw new Error('That username is taken.');
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const user = { id: newId(), username };
    await db.users.add({ ...user, salt, passwordHash: await hashPassword(password, salt), createdAt: Date.now() });
    await seedSampleData(user.id);
    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  }

  async signIn(username: string, password: string) {
    const rec = await db.users.where('username').equalsIgnoreCase(username.trim()).first();
    if (!rec || (await hashPassword(password, rec.salt)) !== rec.passwordHash) {
      throw new Error('Wrong username or password.');
    }
    localStorage.setItem(SESSION_KEY, rec.id);
    return { id: rec.id, username: rec.username };
  }

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  }
}

export const auth: AuthService = new LocalAuthService();
