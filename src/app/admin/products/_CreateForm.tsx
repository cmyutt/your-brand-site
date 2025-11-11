"use client";

import { useFormState } from "react-dom";
import { createProduct } from "./productActions";

const initialState = { error: undefined as string | undefined };

export default function CreateForm() {
  const [state, formAction] = useFormState(createProduct, initialState);

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gap: 8,
        border: "1px solid #eee",
        padding: 16,
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>상품 등록</h2>

      <input name="name" placeholder="name" required />
      <input name="slug" placeholder="slug (영문/하이픈)" required />
      <input
        name="price"
        type="text"
        inputMode="numeric"
        placeholder="price (원) — 199,000도 가능"
        title="숫자 또는 숫자+쉼표"
        required
      />
      <textarea name="description" placeholder="description(optional)" />
      <textarea
        name="images"
        placeholder={`이미지 URL(줄바꿈)\nhttps://picsum.photos/seed/a/800/1000`}
        rows={3}
      />
      <input name="variants" placeholder="옵션(콤마 구분) 예: S,M,L" />

      <button type="submit">Create</button>

      {/* 🔴 서버 액션에서 온 메시지 출력 */}
      {state.error && (
        <p style={{ color: "crimson", marginTop: 8 }}>{state.error}</p>
      )}
    </form>
  );
}
