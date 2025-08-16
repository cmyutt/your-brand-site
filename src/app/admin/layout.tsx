export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Admin</h1>
      {children}
    </section>
  );
}
