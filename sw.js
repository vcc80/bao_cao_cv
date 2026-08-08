/**
 * Service worker tối giản cho PWA "Báo cáo Dân Y".
 * Mục tiêu duy nhất: (1) giúp trình duyệt coi trang là "có thể cài đặt" (installable),
 * (2) mở nhanh hơn ở lần sau, (3) không bao giờ can thiệp vào các lệnh gọi tới
 * Google Apps Script / Google Sheet — dữ liệu báo cáo luôn phải lấy trực tiếp,
 * không được lấy từ cache kẻo hiển thị sai dữ liệu cũ.
 */

const CACHE_NAME = "danyclinic-shell-v2";
const APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Không đụng vào bất kỳ request nào tới Google (Apps Script API, Google Sheets...)
  if (url.includes("script.google.com") || url.includes("googleapis.com") || url.includes("googleusercontent.com")) {
    return;
  }
  // Chỉ xử lý GET (bỏ qua POST và các method khác)
  if (event.request.method !== "GET") return;

  // Chiến lược: ưu tiên mạng (network-first) để luôn có bản mới nhất,
  // nếu mất mạng thì mới lấy bản đã lưu tạm (offline fallback).
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
