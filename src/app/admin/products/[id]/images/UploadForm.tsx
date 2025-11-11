"use client";
import { useState } from "react";
import { uploadProductImage } from "./actions";

export default function UploadForm({ productId }: { productId: string }) {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      await uploadProductImage(formData);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="productId" value={productId} />
      <input type="file" name="file" accept="image/*" required />
      <input type="text" name="alt" placeholder="대체 텍스트(선택)" style={{ width: 220 }} />
      <button type="submit" disabled={pending}>{pending ? "업로드 중..." : "업로드"}</button>
    </form>
  );
}
