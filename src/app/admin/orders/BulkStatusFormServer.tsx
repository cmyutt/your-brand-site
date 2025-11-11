// src/app/admin/orders/BulkStatusFormServer.tsx
// 서버 컴포넌트: SelectionStickyBar가 hidden 필드를 주입하고 이 폼을 submit 합니다.
import { bulkSetOrderStatus } from "./_bulkActions";

export default function BulkStatusFormServer() {
  return (
    <form id="bulkStatusForm" action={bulkSetOrderStatus}>
      {/* 숨김 submit 버튼: requestSubmit 안정성 확보 */}
      <button type="submit" id="bulkStatusSubmit" className="hidden" aria-hidden>
        submit
      </button>
    </form>
  );
}

