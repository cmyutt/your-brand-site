export default function VerifySuccessPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-xl font-semibold">이메일 인증 완료</h1>
      <p className="text-gray-700">계정 이메일 인증이 완료되었습니다. 이제 로그인하실 수 있어요.</p>
      <div className="mt-4">
        <a href="/login" className="rounded-md bg-black px-3 py-2 text-white">로그인으로 이동</a>
        <a href="/" className="ml-2 rounded-md border px-3 py-2">홈으로</a>
      </div>
    </div>
  );
}

