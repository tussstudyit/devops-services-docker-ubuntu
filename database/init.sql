CREATE DATABASE IF NOT EXISTS devops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE devops_db;

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- 1. Bảng Người dùng (Đăng ký / Đăng nhập bằng Gmail)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    avatar_url VARCHAR(500) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Online',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Bảng Phòng / Nhóm Chat
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    description VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    avatar VARCHAR(500) DEFAULT ''
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Bảng Tin nhắn trong Nhóm
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Khởi tạo sẵn 3 nhóm chat đồ án
INSERT INTO rooms (id, name, description, avatar) VALUES
(1, 'Nhóm Đồ Án DevOps (LOQ-15)', 'Trao đổi tiến độ Docker & Jenkins CI/CD', '🚀'),
(2, 'Kênh Chém Gió & Giải Trí', 'Kênh trò chuyện tự do sau giờ học', '☕'),
(3, 'Hỗ Trợ Kỹ Thuật Ubuntu', 'Thảo luận fix bug Linux & Nginx Proxy', '🐧');

-- Khởi tạo sẵn 3 tài khoản Gmail mẫu (Mật khẩu: 123456)
INSERT INTO users (id, email, password, full_name, avatar_url) VALUES
(1, 'tuss.devops@gmail.com', '123456', 'Đặng Tuấn', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop'),
(2, 'hoangnam.le@gmail.com', '123456', 'Lê Hoàng Nam', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop'),
(3, 'minhanh.tran@gmail.com', '123456', 'Trần Minh Anh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop');

-- Khởi tạo tin nhắn chat mẫu ban đầu
INSERT INTO messages (room_id, user_id, content, created_at) VALUES
(1, 1, 'Chào cả nhóm! Ứng dụng GreenChat giao diện màu xanh lá cây đã chạy mượt mà trên Ubuntu.', NOW() - INTERVAL 25 MINUTE),
(1, 2, 'Tone màu xanh lá cây mát mắt và hiện đại ghê, không lo bị dính bản quyền nữa nhé!', NOW() - INTERVAL 20 MINUTE),
(1, 3, 'Tài khoản đăng nhập bằng Gmail lưu vào MySQL cực kỳ ổn định. Chuẩn bị qua bước CI/CD thôi.', NOW() - INTERVAL 10 MINUTE);
