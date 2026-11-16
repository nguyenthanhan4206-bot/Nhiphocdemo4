import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteAccountModalProps {
  displayName: string;
  dark?: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  displayName,
  dark = false,
  onClose,
  onConfirmDelete,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canConfirm = confirmText.trim().toUpperCase() === 'XOA';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      await onConfirmDelete();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Bạn đã đóng cửa sổ xác thực lại trước khi hoàn tất xóa tài khoản.');
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Không thể xóa tài khoản lúc này. Vui lòng thử lại.',
        );
      }
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-xl ${
          dark
            ? 'bg-[#221D17] border-[#3A3227] text-[#F7F2E7]'
            : 'bg-white border-[#E5DBC4] text-[#231E18]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                dark ? 'bg-red-950/60 text-red-300' : 'bg-red-50 text-red-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-account-title" className="text-base font-bold">
                Xóa tài khoản NhịpHọc
              </h3>
              <p className={`text-xs ${dark ? 'text-[#C8BCAA]' : 'text-[#6B6154]'}`}>
                {displayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={`p-1.5 rounded-lg ${
              dark ? 'text-[#C8BCAA] hover:bg-[#2F2820]' : 'text-[#6B6154] hover:bg-[#FDF3D0]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`rounded-xl border p-3.5 text-xs leading-relaxed space-y-1.5 ${
            dark
              ? 'bg-[#181511] border-[#3A3227] text-[#DCD1BF]'
              : 'bg-[#FBF8F1] border-[#E5DBC4] text-[#5C5347]'
          }`}
        >
          <p>Hành động này sẽ xóa vĩnh viễn:</p>
          <p>• Hồ sơ NhịpHọc, email và số điện thoại cá nhân của bạn.</p>
          <p>
            • Dữ liệu học tập riêng của bạn (nếu bạn đang liên kết chung với Phụ huynh/Trợ lý/Học
            sinh khác, liên kết của bạn sẽ được gỡ bỏ an toàn mà không làm mất dữ liệu của họ).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="confirm-delete-input"
              className={`block text-xs font-semibold mb-1.5 ${
                dark ? 'text-[#F7F2E7]' : 'text-[#231E18]'
              }`}
            >
              Nhập <span className="font-mono font-bold text-red-500">XOA</span> để xác nhận
            </label>
            <input
              id="confirm-delete-input"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="XOA"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none ${
                dark
                  ? 'bg-[#181511] border-[#3A3227] text-[#F7F2E7] focus:border-red-400'
                  : 'bg-white border-[#E5DBC4] text-[#231E18] focus:border-red-500'
              }`}
            />
          </div>

          {errorMsg && (
            <p
              className={`text-xs rounded-xl border px-3.5 py-2.5 ${
                dark
                  ? 'bg-red-950/50 border-red-800 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                dark ? 'text-[#C8BCAA] hover:bg-[#2F2820]' : 'text-[#6B6154] hover:bg-[#FDF3D0]'
              }`}
            >
              Giữ lại tài khoản
            </button>
            <button
              type="submit"
              disabled={!canConfirm || deleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
