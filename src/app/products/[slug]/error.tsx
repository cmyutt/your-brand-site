'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div style={{ maxWidth: 960, margin: '24px auto', color: 'crimson' }}>
      오류가 발생했어요: {error.message}
    </div>
  );
}
