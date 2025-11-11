"use client";

type Props = {
  /** 체크박스 쿼리 범위를 한정하고 싶을 때 컨테이너 선택자. 기본은 문서 전체 */
  scopeSelector?: string;
  className?: string;
};

function setAll(checked: boolean, scope?: Element | Document) {
  const root: Element | Document = scope ?? document;
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="selectOrder"]'));
  for (const el of boxes) {
    if (el.disabled) continue;
    el.checked = checked;
    // change 이벤트를 날려서 스티키바 등 리스너가 반응하게 함
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export default function OrdersSelectAll({ scopeSelector, className }: Props) {
  function handle(all: boolean) {
    const scope = scopeSelector ? document.querySelector(scopeSelector) ?? undefined : undefined;
    setAll(all, scope);
  }

  return (
    <div className={["flex items-center gap-2", className ?? ""].join(" ")}>
      <button
        type="button"
        onClick={() => handle(true)}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        title="현재 페이지의 모든 주문을 선택"
      >
        전체 선택
      </button>
      <button
        type="button"
        onClick={() => handle(false)}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        title="현재 페이지의 선택 해제"
      >
        전체 해제
      </button>
    </div>
  );
}
