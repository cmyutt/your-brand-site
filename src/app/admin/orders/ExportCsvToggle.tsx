"use client";

export default function ExportCsvToggle() {
  function handle(all: boolean, e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = e.currentTarget.closest("form") as HTMLFormElement | null;
    if (!form) return;
    const boxes = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="cols"]');
    boxes.forEach((b) => (b.checked = all));
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        className="rounded-lg px-2 py-1 ring-1 ring-gray-200 hover:bg-gray-50"
        onClick={(e) => handle(true, e)}
        type="button"
        title="모든 컬럼 체크"
      >
        전체 선택
      </button>
      <button
        className="rounded-lg px-2 py-1 ring-1 ring-gray-200 hover:bg-gray-50"
        onClick={(e) => handle(false, e)}
        type="button"
        title="모든 컬럼 해제"
      >
        전체 해제
      </button>
    </div>
  );
}
