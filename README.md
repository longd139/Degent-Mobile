# CAISHOP Executive Mobile App 📱

Ứng dụng di động quản trị tập trung (Executive Control) dành cho **CAISHOP**, hỗ trợ theo dõi đơn hàng, quản lý danh mục sản phẩm và trạng thái tồn kho theo thời gian thực.

Dự án được xây dựng bằng **React Native (Expo SDK 58)** và **TypeScript**, tuân thủ nguyên tắc thiết kế tối giản, trực quan và tốc độ cao của CAISHOP.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cài đặt thư viện (nếu cần tải lại)
```bash
npm install
```

### 2. Khởi động ứng dụng
```bash
# Khởi động Expo Dev Server:
npm start

# Hoặc khởi động xem trực tiếp trên trình duyệt Web:
npm run web
```

### 3. Xem và kiểm thử ứng dụng
- **Trên điện thoại thật (iPhone / Android)**:
  1. Cài ứng dụng **Expo Go** từ App Store hoặc Google Play.
  2. Mở camera (iOS) hoặc app Expo Go (Android) quét mã QR hiển thị trên màn hình terminal.
- **Trên trình duyệt máy tính**: Nhấn phím `w` trong terminal hoặc chạy `npm run web`.

---

## 🔐 Tài Khoản Đăng Nhập Sẵn Có

Hệ thống kết nối trực tiếp với cơ sở dữ liệu xác thực của CAISHOP (`/api/auth/login`):

| Vai trò | Số điện thoại | Email | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Quản trị viên (Chủ shop)** | `0901234567` | `admin@caishop.vn` | `admin123` | Quản lý toàn quyền đơn hàng & sản phẩm |
| **👤 Khách hàng** | `0987654321` | `khachhang@caishop.vn` | `user123` | Xem đơn hàng cá nhân |

*(Màn hình đăng nhập đã tích hợp sẵn 2 nút chip "Admin" và "User" để tự động điền nhanh khi test).*

---

## 🌐 Cấu Hình Địa Chỉ Máy Chủ API

- Khi chạy trên trình duyệt web máy tính: Mặc định kết nối tới `http://localhost:3000`.
- Khi chạy trên điện thoại thật (Expo Go) qua cùng mạng Wi-Fi: Mặc định kết nối tới IP máy chủ của bạn (`http://192.168.1.2:3000`).
- Người dùng có thể nhấn vào nút **⚙️ Máy chủ** ngay dưới màn hình đăng nhập để linh hoạt thay đổi IP bất cứ lúc nào mà không cần sửa code.

---

## 📂 Cấu Trúc Dự Án

```
Degent-Mobile/
├── App.tsx                     # Entrypoint điều hướng & SafeArea
├── app.json                    # Cấu hình Expo và metadata
├── src/
│   ├── api/
│   │   ├── config.ts           # Quản lý địa chỉ server URL & AsyncStorage
│   │   └── auth.ts             # Gọi API login & me từ CAISHOP
│   ├── context/
│   │   └── AuthContext.tsx     # Quản lý state đăng nhập, token JWT toàn app
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Màn hình đăng nhập chuẩn thiết kế CAISHOP
│   │   └── HomeScreen.tsx      # Bảng điều hành: Đơn hàng & Sản phẩm
│   ├── theme/
│   │   └── colors.ts           # Token màu sắc Slate 900 & Blue 600
│   └── types/
│       └── auth.ts             # TypeScript interfaces cho người dùng & auth
```
