<div align="center">
  
# 🎨 Ritual Hide & Paint
**On-Chain Gaming Powered by Ritual Network**

![Ritual Network](https://img.shields.io/badge/Network-Ritual%20Testnet-8b5cf6?style=for-the-badge&logo=web3)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Style-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css)

</div>

## 📖 Giới thiệu (About the Project)

**Ritual Hide & Paint** là một tựa game Web3 On-chain độc đáo, nơi sự sáng tạo và chiến thuật kết hợp với sức mạnh của công nghệ AI trên Blockchain. 

Trong trò chơi này, nhiệm vụ của người chơi là thiết kế và tô màu (paint) nhân vật 16x16 pixel của mình sao cho **ngụy trang (camouflage)** hoàn hảo nhất vào một bản đồ 160x160 pixel. Kẻ thù của bạn không ai khác chính là **AI Bot (Seeker)** - một con AI thông minh được vận hành trên mạng lưới Ritual Network sẽ đi dò tìm bạn dựa vào độ tương phản màu sắc.

Bạn ngụy trang càng tốt, AI càng khó tìm ra bạn!

## ✨ Tính năng nổi bật (Features)

- 🔐 **Web3 Authentication:** Kết nối ví ẩn danh, an toàn thông qua `Wagmi` & `WalletConnect`.
- 🎨 **Pixel Art Studio:** Trình chỉnh sửa nhân vật in-game với đầy đủ công cụ: Brush (Cọ vẽ), Eraser (Cục tẩy), Eyedropper (Hút màu), và Color Palette phong phú.
- 🗺️ **Đa dạng Bản đồ (Maps):** Hệ thống map đa dạng được chia làm 3 cấp độ (Easy, Normal, Hard). Tích hợp chế độ phóng to (Click-to-Enlarge) siêu nét hỗ trợ dò tìm tọa độ pixel.
- 🤖 **AI Seeker On-chain:** AI hoạt động dưới dạng Smart Contract xác định vị trí của bạn thông qua thuật toán phân tích điểm ảnh.
- 🏆 **Leaderboard & RITUAL Token:** Tham gia, chiến thắng AI và giành phần thưởng bằng Token của mạng lưới.

## 🖼️ Giao diện trò chơi (UI Preview)

Trải nghiệm hình ảnh Cyberpunk/Neon mượt mà, tối ưu hiển thị 100% trên màn hình (No scrollbars):
- **Game Config:** Lựa chọn chế độ chơi (PvP / vs AI Bot), chọn bản đồ và xem thông tin tỷ lệ.
- **Character:** Vẽ và tùy chỉnh nhân vật bằng cách tô từng điểm ảnh (Pixel-perfect).
- **Map Preview:** Chế độ thu phóng bản đồ chất lượng cao giúp người chơi lên chiến thuật màu sắc.

## 🚀 Công nghệ sử dụng (Tech Stack)

### Frontend
- **Framework:** React 18 + Vite (Siêu nhẹ, siêu nhanh)
- **Styling:** TailwindCSS (Cyberpunk Neon theme, Glassmorphism)
- **Icons:** Lucide React
- **Web3:** Wagmi, Viem (Xử lý giao dịch On-chain)
- **Deployment:** Vercel

### Backend / Smart Contract (Upcoming)
- **Blockchain:** Ritual Network Testnet
- **Language:** Solidity / Foundry
- **AI Integration:** Ritual Coprocessor (On-chain Machine Learning Inference)

## 🛠️ Cài đặt & Chạy cục bộ (Local Setup)

```bash
# 1. Clone repository
git clone https://github.com/tuannguyenvan95/ritual-hide-paint.git
cd ritual-hide-paint/frontend

# 2. Cài đặt thư viện
npm install

# 3. Khởi động môi trường dev
npm run dev
```

Truy cập vào `http://localhost:5173` để trải nghiệm trò chơi.

## 📜 Roadmap

- [x] Phát triển giao diện UI/UX (Frontend)
- [x] Tích hợp bộ vẽ Pixel Art Studio (Character Builder)
- [x] Hoàn thiện hệ thống Maps đa cấp độ
- [ ] Xây dựng & Triển khai Smart Contract lên Ritual Testnet
- [ ] Tích hợp tính năng phán đoán của AI Seeker
- [ ] Tính năng PvP giữa những người chơi

---
<div align="center">
  <i>Được xây dựng với 💖 cho cộng đồng Web3 & Ritual Network.</i>
</div>
