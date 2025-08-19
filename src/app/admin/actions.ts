'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  // admin 세션 쿠키 삭제 (set으로 무효화)
  const cookieStore = await cookies();
  cookieStore.set('admin', '', { path: '/', maxAge: 0 });

  // 로그인 페이지로 이동
  redirect('/admin/login');
}
