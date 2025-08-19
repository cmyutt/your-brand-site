// src/app/admin/actions.ts
'use server';

import { NextResponse } from 'next/server';

export async function logoutAction(_: FormData) {
  // 로그인 페이지로 리다이렉트
  const res = NextResponse.redirect('/admin/login');
  // 쿠키 제거
  res.cookies.set('admin', '', { path: '/', maxAge: 0 });
  return res;
}
