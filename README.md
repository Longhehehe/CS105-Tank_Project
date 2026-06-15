# CS105 - Tank Project (Tank Runner 3D)

## 📌 Giới thiệu về dự án

**Tank Runner 3D** là một dự án game 3D thuộc môn Đồ họa Máy tính (CS105). Lấy cảm hứng từ thể loại trò chơi chạy vô tận (endless runner), người chơi sẽ điều khiển một chiếc xe tăng di chuyển liên tục, né tránh chướng ngại vật đồng thời có thể ngắm bắn các mục tiêu trên đường. 

Dự án được xây dựng hoàn toàn trên nền tảng Web với **HTML/CSS/JS** và thư viện **Three.js**, là minh chứng cho việc ứng dụng lý thuyết Đồ họa Máy tính vào thực tiễn, bao gồm:
- **Biến đổi Affine gốc**: Tịnh tiến (Translation), Quay (Rotation), và Tỉ lệ (Scaling) các vật thể 3D.
- **Ánh sáng & Đổ bóng (Lighting & Shading)**: Áp dụng đa dạng các loại ánh sáng (Ambient, Hemisphere, Directional, Point Light) kết hợp bóng đổ thời gian thực (Shadows).
- **Vật liệu và Texture (Materials)**: Sử dụng các mô hình chiếu sáng PBR với roughness, metalness, normal maps, texture repeat và anisotropy.
- **Loaders cho Mô hình 3D**: Tích hợp hệ thống nạp Object 3D phức tạp (GLTF, GLB, FBX) tự cấu hình linh hoạt.
- **Thuật toán & Game Loop**: Vòng lặp trò chơi xử lý animation, di chuyển vật thể, quản lý đạn, hiệu ứng cháy nổ.
- **Chế độ hiển thị**: Hỗ trợ chuyển đổi hiển thị giữa Point (điểm), Line (wireframe/khung xương dây), và Solid (đổ khối đặc).

---

## 🛠 Hướng dẫn cài đặt & Khởi chạy trên Windows

Vì game bao hàm các tài nguyên ngoại tuyến như Models (.gltf, .fbx...) và Textures (hình ảnh) nên máy tính cần phải chạy trên một máy chủ cục bộ (Local Server) nhằm vượt qua các quy định an ninh (CORS policy) của trình duyệt. 

Làm theo các bước sau để thiết lập project và trải nghiệm ngay:

### Bước 1: Clone dự án về máy tính
Mở **Command Prompt**, **PowerShell** hoặc **Git Bash** và chạy lệnh:
```bash
git clone <địa_chỉ_repo_github_của_dự_án>
cd CS105-Tank_Project
```
*(Nếu bạn tải file `.zip` trực tiếp từ Github thì hãy giải nén và mở Terminal tại thư mục gốc của project).*

---

### Bước 2: Khởi chạy dự án (Chọn 1 trong 3 cách sau)

Chúng tôi cung cấp 3 cách dễ dàng nhất trên Windows để bạn chạy dự án. Bạn chỉ cần chọn **một cách** thuận tiện nhất với mình.

#### 🟢 Cách 1: Sử dụng Visual Studio Code (Dễ nhất & Khuyên dùng)
1. Mở thư mục `CS105-Tank_Project` vừa clone bằng **Visual Studio Code**.
2. Sang tab Extensions (`Ctrl + Shift + X`), tìm và cài đặt tiện ích **Live Server** (của tác giả Ritwick Dey).
3. Sau khi cài đặt xong, bấm mở file `index.html` trong khu vực Explorer.
4. Nhấn **chuột phải** vào màn hình code của file `index.html` chọn **"Open with Live Server"** (Hoặc nhìn xuống cạnh viền dưới cùng bên phải màn hình VS Code sẽ có nút **"Go Live"**, Click trực tiếp vào nút đó).
5. Trình duyệt sẽ được khởi chạy tự động tại địa chỉ `http://127.0.0.1:5500`.

#### 🔵 Cách 2: Sử dụng Python (Dành cho máy đã cài sẵn Python)
1. Mở Command Prompt hoặc PowerShell tại vị trí thư mục dự án `CS105-Tank_Project`.
2. Chạy lệnh sau để bật Web Server:
   ```cmd
   python -m http.server 5500
   ```
3. Mở trình duyệt Web (Chrome, Edge...) và truy cập URL: [http://localhost:5500](http://localhost:5500).

#### 🟡 Cách 3: Sử dụng NPM (Nếu máy tính đã cài đặt Node.js)
1. Mở Command Prompt hoặc PowerShell tại thư mục dự án `CS105-Tank_Project`.
2. Gõ lệnh:
   ```cmd
   npm.cmd run dev
   ```
3. Mở trình duyệt Web truy cập URL: [http://localhost:5500](http://localhost:5500).

---

## 🎮 Cách điều khiển trong Game

- **Di chuyển xe tăng:** Nhấn phím `A` hoặc `D` (Hoặc phím Mũi tên TRÁI / PHẢI) để xe chuyển làn né chướng ngại vật.
- **Tấn công (Bắn đạn):** Nhấn phím `Space` (Dấu cách).
- **Tính năng mở rộng Đồ họa (Bên tay phải màn hình):** Sử dụng các nút bấm Bảng Menu (UI) để quan sát thay đổi đồ họa như bật/tắt bóng đổ, tinh chỉnh biến đổi góc nhìn Camera và đổi hệ số Affine Transform theo ý thích (Scale, Rotate, Translate).

---

## 📁 Cấu trúc thư mục chính của dự án

```text
.
|-- index.html              # Core file - Entrypoint chính của Web game.
|-- package.json            # Thông tin đóng gói & command chạy (Nodejs).
|-- README.md               # File thông tin hướng dẫn về project.
|-- src/
|   |-- css/
|   |   `-- styles.css      # Mã nguồn UI tĩnh cho các Controls, Control Panel.
|   `-- js/
|       `-- app.js          # Logic Game chính bằng Three.js (Rendering, Game loop...).
|-- assets/
|   `-- textures/           # Thư viện lưu trữ Texture (Đường mòn, Vật liệu, Bầu trời...).
|-- vendor/
|   `-- three/              # Chứa nhân Three.js nội bộ, các plugin loaders, shader... (Hỗ trợ chạy Offline).
`-- docs/                   # Tài liệu đọc thêm về lý thuyết đồ họa toán học.
```
