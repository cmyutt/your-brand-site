import { uploadProductImage } from "./actions";

// 서버 컴포넌트에서 서버 액션을 <form action={...}> 로 연결
export default function UploadForm({ productId }: { productId: string }) {
  return (
    <form
      // ❌ encType, method 금지 (React가 자동 설정)
      action={uploadProductImage}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        border: "1px dashed #ccc",
        padding: 12,
        borderRadius: 12,
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="file" name="file" accept="image/*" required />
      <input
        type="text"
        name="alt"
        placeholder="대체 텍스트(선택)"
        style={{ width: 200 }}
      />
      <button type="submit">업로드</button>
    </form>
  );
}
