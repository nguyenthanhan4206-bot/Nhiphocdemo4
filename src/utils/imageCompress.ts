export function generateDocId(prefix = 'nh'): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
  return `${prefix}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'NH';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function compressImageFileToDataUrl(
  file: Blob,
  maxDimension = 860,
  quality = 0.68,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể xử lý định dạng ảnh'));
    image.src = dataUrl;
  });

  return compressImageElement(img, maxDimension, quality);
}

export function compressImageElement(
  source: HTMLImageElement | HTMLVideoElement,
  maxDimension = 860,
  quality = 0.68,
): string {
  const rawW = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const rawH = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!rawW || !rawH) {
    throw new Error('Ảnh chưa sẵn sàng để chụp');
  }

  let targetW = rawW;
  let targetH = rawH;
  if (rawW > maxDimension || rawH > maxDimension) {
    if (rawW >= rawH) {
      targetW = maxDimension;
      targetH = Math.round((rawH * maxDimension) / rawW);
    } else {
      targetH = maxDimension;
      targetW = Math.round((rawW * maxDimension) / rawH);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không khởi tạo được bộ nén ảnh');
  }
  ctx.drawImage(source, 0, 0, targetW, targetH);

  let output = canvas.toDataURL('image/jpeg', quality);
  let q = quality;
  while (output.length > 235000 && q > 0.35) {
    q -= 0.1;
    output = canvas.toDataURL('image/jpeg', q);
  }

  if (output.length > 255000) {
    throw new Error('Ảnh quá lớn, vui lòng chọn ảnh nhẹ hơn hoặc chụp gần hơn.');
  }
  return output;
}

export function formatTimeAgoVi(ms: number): string {
  if (!ms) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return new Date(ms).toLocaleDateString('vi-VN');
}

export function formatCountdownMs(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
