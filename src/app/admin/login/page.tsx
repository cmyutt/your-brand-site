// src/app/admin/login/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

type SearchParams = { next?: string; error?: string };

export default async function AdminLoginPage({
  // ✅ Next 15: searchParams 는 Promise 형태
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? '/admin/products';
  const error = sp?.error ? '비밀번호가 올바르지 않습니다.' : '';

  // ✅ 서버 액션들은 export 하지 말 것
  async function loginAction(formData: FormData) {
    'use server';

    const pass = String(formData.get('password') ?? '');

    if (!process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD 미설정');
    }
    if (pass !== process.env.ADMIN_PASSWORD) {
      redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
    }

    const c = await cookies();
    c.set('admin', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12h
    });

    redirect(next);
  }

  async function logoutAction() {
    'use server';
    const c = await cookies();
    c.set('admin', '', { path: '/', maxAge: 0 });
    redirect('/admin/login');
  }

  return (
    <main style={{ maxWidth: 360, margin: '88px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <form action={logoutAction}>
          <button type="submit">Logout</button>
        </form>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Admin Login</h1>

      <form action={loginAction} style={{ display: 'grid', gap: 8 }}>
        <input type="hidden" name="next" value={next} />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
        />
        <button type="submit">Login</button>
      </form>

      <p style={{ opacity: 0.7, marginTop: 12, color: 'crimson' }}>{error}</p>
    </main>
  );
}
