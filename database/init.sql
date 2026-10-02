CREATE DATABASE IF NOT EXISTS devops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE devops_db;

DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    author_handle VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT '',
    content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO posts (author_name, author_handle, avatar_url, content, likes_count) VALUES
('Lê Hoàng Nam', 'namle_dev', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces', 'Vừa cấu hình xong Nginx Reverse Proxy và Docker Compose trên Ubuntu! Hệ thống chạy rất mượt mà.', 12),
('Trần Minh Tuấn', 'tuan_cloud', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces', 'Chuẩn bị kết nối Webhook từ GitHub sang Jenkins để tự động hóa quy trình CI/CD. Có ai trong nhóm rảnh test cùng không?', 8),
('Nguyễn Mai Phương', 'phuong_ui', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces', 'Giao diện mạng xã hội Pulse trông tối giản và hiện đại hơn hẳn. Database MySQL lưu dữ liệu chuẩn UTF-8 rồi nhé cả nhóm!', 19);
