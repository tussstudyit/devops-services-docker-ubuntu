CREATE DATABASE IF NOT EXISTS devops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE devops_db;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    author_avatar VARCHAR(255) NOT NULL,
    content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    image_url VARCHAR(500) DEFAULT '',
    feeling VARCHAR(100) DEFAULT '',
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    author_avatar VARCHAR(255) NOT NULL,
    content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dữ liệu bài viết khởi tạo chuẩn phong cách Facebook
INSERT INTO posts (id, author_name, author_avatar, content, image_url, feeling, likes_count, created_at) VALUES
(1, 'Đặng Tuấn', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces', 
'🎉 Nhóm mình vừa hoàn thành giai đoạn 1 của đồ án DevOps: Đóng gói thành công ứng dụng trên Ubuntu với Docker Compose, Nginx Reverse Proxy và MySQL volume!\n\nCảm giác chạy 1 lệnh là toàn bộ stack lên mượt mà thực sự rất tuyệt vời.', 
'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&h=450&fit=crop', 'đang cảm thấy hào hứng 🚀', 28, NOW() - INTERVAL 45 MINUTE),

(2, 'Lê Hoàng Nam', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=faces', 
'Có bạn nào trong lớp gặp lỗi mất dữ liệu khi restart MySQL container không? Nhớ mount named volume nhé, đừng lưu trực tiếp vào writable layer của container kẻo mất hết data đồ án đấy!', 
'', 'đang chia sẻ mẹo hay 💡', 14, NOW() - INTERVAL 2 HOUR);

-- Dữ liệu bình luận mẫu
INSERT INTO comments (post_id, author_name, author_avatar, content, created_at) VALUES
(1, 'Trần Minh Anh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces', 'Giao diện mượt quá bạn ơi, nhìn xịn xò như Facebook thật luôn!', NOW() - INTERVAL 30 MINUTE),
(1, 'Nguyễn Quốc Huy', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces', 'Test thử thêm bài viết và bình luận thấy MySQL lưu chuẩn UTF-8 rồi nhé.', NOW() - INTERVAL 15 MINUTE),
(2, 'Đặng Tuấn', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces', 'Chuẩn luôn, docker volume là cứu tinh!', NOW() - INTERVAL 1 HOUR);
