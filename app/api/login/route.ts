import type { User } from '@/models/user';
import { NextResponse } from 'next/server';

const users: Array<{ username: string; password: string; user: User }> = [
  {
    username: 'admin',
    password: 'admin123',
    user: { id: '1', username: 'admin', name: 'Administrator', role: 'admin' },
  },
  {
    username: 'manager',
    password: 'manager123',
    user: { id: '2', username: 'manager', name: 'Manager', role: 'manager' },
  },
];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const found = users.find((u) => u.username === username && u.password === password);

    if (!found) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    return NextResponse.json({ user: found.user }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
