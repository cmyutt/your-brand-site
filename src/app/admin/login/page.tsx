// src/app/admin/login/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs'; // 서버 액션에서 process.env 사용

export async function loginAction(formData: FormData) {
  'use server';

  const pass = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin/products');

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD 미설정');
  }
  if (pass !== process.env.ADMIN_PASSWORD) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  jar.set('admin', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  });

  redirect(next);
}

export default function AdminLogin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const next =
    typeof searchParams?.next === 'string'
      ? searchParams.next
      : '/admin/products';
  const error = searchParams?.error ? '비밀번호가 올바르지 않습니다.' : '';

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Admin Login</h1>
      {error && (
        <p style={{ color: 'crimson', marginBottom: 8 }}>
          {error}
        </p>
      )}
      <form action={loginAction} style={{ display: 'grid', gap: 8 }}>
        <input type="hidden" name="next" value={next} />
        <input name="password" type="password" placeholder="비밀번호" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
