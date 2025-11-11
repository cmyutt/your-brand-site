export default function VerifyFailPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-xl font-semibold">인증 링크가 유효하지 않아요</h1>
      <p className="text-gray-700">토큰이 만료되었거나 잘못되었을 수 있어요. 로그인 화면에서 인증 메일을 다시 요청해 주세요.</p>
      <div className="mt-4">
        <a href="/login" className="rounded-md bg-black px-3 py-2 text-white">로그인으로 이동</a>
        <a href="/forgot-password" className="ml-2 rounded-md border px-3 py-2">비밀번호 재설정</a>
      </div>
    </div>
  );
}

