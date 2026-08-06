export const SITE = {
  name: "Crypto Market VN",
  shortName: "CMVN",
  tagline: "Giá coin, tâm lý thị trường và tin nóng mỗi ngày",
  description:
    "Theo dõi giá tiền ảo, chỉ số Fear and Greed, top tăng giảm, biểu đồ realtime và tin crypto mới nhất trên thị trường.",
  locale: "vi-VN",
  timezone: "Asia/Ho_Chi_Minh",
  logoPath: "/logo.svg",
  /** Ảnh chia sẻ mạng xã hội 1200×630 */
  ogImagePath: "/og-image.png",
};

export const NAV = [
  { href: "/", label: "Tổng quan" },
  { href: "/thi-truong", label: "Thị trường" },
  { href: "/tin-tuc", label: "Tin tức" },
] as const;
