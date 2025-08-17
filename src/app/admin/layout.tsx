// src/app/admin/layout.tsx
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  'use server';
  const jar = await cookies();
  jar.set('admin', '', { path: '/', maxAge: 0 });
  redirect('/admin/login');
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const isAuthed = jar.get('admin')?.value === '1';

  return (
    <section style={{ maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <strong>Admin</strong>
        {isAuthed && (
          <form action={logoutAction} style={{ marginLeft: 'auto' }}>
            <button type="submit">Logout</button>
          </form>
        )}
      </div>
      {children}
    </section>
  );
}
