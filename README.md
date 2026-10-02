# Configure and Deploy DevOps Services with Docker on Ubuntu

> **Đồ án môn học:** Xây dựng một môi trường DevOps trên Ubuntu Linux, trong đó các dịch vụ được đóng gói và vận hành hoàn toàn bằng Docker.

---

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC

Hệ thống triển khai một ứng dụng Chat nhóm nội bộ mang tên **GreenChat** với tone màu xanh lá cây mát mắt và hiện đại, hỗ trợ hệ thống đăng ký / đăng nhập bằng **Gmail**, được vận hành theo mô hình Microservices/Containerized kết hợp luồng tự động hóa tích hợp và triển khai liên tục (**CI/CD Pipeline**).

### Mô hình luồng dữ liệu (Architecture Diagram)

```
                                  ┌──────────────────────────┐
                                  │      Developer Team      │
                                  │   (VS Code / Ubuntu OS)  │
                                  └─────────────┬────────────┘
                                                │
                                            git push
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │     GitHub Repository    │
                                  │  (devops-docker-project) │
                                  └─────────────┬────────────┘
                                                │
                                      Webhook / Smee.io
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │      Jenkins CI Server   │
                                  │    (Docker Container)    │
                                  │                          │
                                  │  1. Checkout Code        │
                                  │  2. Lint / Unit Test     │
                                  │  3. Docker Build Image   │
                                  │  4. Push Docker Hub      │
                                  │  5. Trigger Deploy       │
                                  └─────────────┬────────────┘
                                                │
                                         Docker Image Push
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │      Docker Registry     │
                                  │     (Docker Hub Repo)    │
                                  └─────────────┬────────────┘
                                                │
                                         docker pull
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             UBUNTU LINUX HOST                               │
│                                                                             │
│                          Docker Engine & Compose                            │
│                                     │                                       │
│                           Bridge Network (devops_net)                       │
│                                     │                                       │
│          ┌──────────────────────────┼──────────────────────────┐            │
│          ▼                          ▼                          ▼            │
│   ┌──────────────┐           ┌──────────────┐           ┌──────────────┐    │
│   │ Nginx        │           │ Application  │           │ MySQL 8.0    │    │
│   │ Container    │ ──proxy──>│ Container    │ ──query──>│ Container    │    │
│   │ (Port 80)    │           │ (Port 3000)  │           │ (Port 3306)  │    │
│   │ Reverse Proxy│           │ Node.js/Tailw│           │ Database     │    │
│   └──────────────┘           └──────────────┘           └──────┬───────┘    │
│          ▲                                                     │            │
│          │                                                     ▼            │
│     HTTP Port 80                                        ┌─────────────┐     │
│          │                                              │ Named Volume│     │
│          │                                              │ (mysql_data)│     │
│   [ Client Browser ]                                    └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PHÂN CHIA CÔNG VIỆC TRONG NHÓM (2 PHẦN CHÍNH)

Để tối ưu tiến độ và trách nhiệm rõ ràng, dự án được chia thành 2 phần độc lập:

| Thành phần  | Nhiệm vụ chính | Sản phẩm bàn giao |
| :--- | :--- | :--- | :--- |
| **PHẦN 1: Ứng dụng & Docker Stack**  | • Thiết kế ứng dụng GreenChat (Node.js Express + Tailwind CSS, đăng ký/đăng nhập bằng Gmail).<br>• Tạo Database MySQL với bảng `users`, `friendships`, `conversations`, `conversation_members`, `messages`.<br>• Cấu hình Nginx Reverse Proxy (Port 80) phân luồng sang App.<br>• Đóng gói toàn bộ hệ thống với `Dockerfile` và `docker-compose.yml`. | Hệ thống chạy trơn tru cục bộ trên Ubuntu qua lệnh `docker compose up -d`, truy cập được tại `http://localhost` và mạng LAN `http://172.26.92.9`. |
| **PHẦN 2: Tự động hóa CI/CD & Mạng Ubuntu**  | • Cài đặt Jenkins Server chạy bằng Docker (mount Docker socket trên Ubuntu).<br>• Kiểm thử đa người dùng qua mạng nội bộ Ubuntu (kết bạn & chat giữa 2 tài khoản).<br>• Viết `Jenkinsfile` chuẩn Declarative Pipeline (Build, Push Docker Hub, Deploy).<br>• Cấu hình GitHub Webhook để tự động build & deploy khi có commit mới. | Pipeline tự động hóa CI/CD từ A-Z, hỗ trợ tương tác trực tiếp giữa các thành viên qua mạng Ubuntu. |

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
devops-project/
├── app/
│   ├── server.js               # Mã nguồn ứng dụng GreenChat (Node.js Express)
│   ├── package.json            # Khai báo dependencies (express, mysql2)
│   └── Dockerfile              # Hướng dẫn đóng gói container ứng dụng
├── database/
│   └── init.sql                # Khởi tạo bảng users, friendships, conversations, messages
├── nginx/
│   └── default.conf            # Cấu hình Reverse Proxy chuyển tiếp cổng 80 -> 3000
├── docker-compose.yml          # Quản lý toàn bộ stack (Nginx + App + DB + Volume)
├── Jenkinsfile                 # Định nghĩa các stage trong pipeline CI/CD
└── README.md                   # Tài liệu hướng dẫn đồ án
```

---

## 4. CHI TIẾT KỸ THUẬT - PHẦN 1: APPLICATION & DOCKER STACK

### 4.1. Ứng dụng GreenChat (Team Chat & Friend Management)
* **Frontend:** Giao diện tone xanh ngọc lục bảo (Emerald Green) hiện đại, sử dụng Tailwind CSS qua CDN.
* **Xác thực:** Đăng ký và đăng nhập bảo mật bằng **Gmail** cá nhân (`/login`, `/register`).
* **Tính năng Bạn bè (`/friends`):**
  * Tìm kiếm người dùng qua địa chỉ Gmail trực tiếp từ cơ sở dữ liệu MySQL.
  * Kết bạn 2 chiều (`friendships`), hiển thị danh sách bạn bè, hủy kết bạn.
  * Tự động khởi tạo hội thoại 1-1 khi kết bạn thành công.
* **Tính năng Nhắn tin (`/`):**
  * Tự động nạp cuộc trò chuyện gần nhất ngay khi truy cập.
  * Giao diện Chat thời gian thực với cơ chế Real-time Polling 2 giây.
  * Gửi tin nhắn văn bản, biểu cảm emoji nhanh (`👍`, `❤️`, `🌿`, `🔥`), và link hình ảnh.
  * Hỗ trợ tạo nhóm chat mới (`/groups/create`) với nhiều thành viên.
* **Chuẩn mã hóa:** Thiết lập `utf8mb4` toàn diện đảm bảo hiển thị tiếng Việt chính xác 100%.

### 4.2. Đóng gói Container (`app/Dockerfile`)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 4.3. Cấu hình Nginx Reverse Proxy (`nginx/default.conf`)
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.4. Quản lý hệ thống bằng Docker Compose (`docker-compose.yml`)
* Khởi chạy cùng lúc 3 dịch vụ: `nginx`, `app`, `db`.
* Cấu hình `healthcheck` cho MySQL đảm bảo App chỉ khởi động khi cơ sở dữ liệu đã sẵn sàng.
* Sử dụng Named Volume `mysql_data` để dữ liệu không bị mất khi container bị tắt hoặc tạo lại.

---

## 5. CHI TIẾT KỸ THUẬT - PHẦN 2: CI/CD AUTOMATION VỚI JENKINS

### 5.1. Triển khai Jenkins bằng Docker
Khởi chạy container Jenkins với quyền truy cập vào Docker Daemon của Ubuntu:
```bash
docker run -d \
  --name jenkins_server \
  --restart always \
  -u root \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  jenkins/jenkins:lts-jdk17
```

### 5.2. Luồng thực thi trong `Jenkinsfile`
```groovy
pipeline {
    agent any

    environment {
        DOCKER_HUB_REPO = 'tussstudyit/greenchat-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('2. Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} -t ${DOCKER_HUB_REPO}:latest ./app"
            }
        }

        stage('3. Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo \${DOCKER_PASS} | docker login -u \${DOCKER_USER} --password-stdin"
                    sh "docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}"
                    sh "docker push ${DOCKER_HUB_REPO}:latest"
                }
            }
        }

        stage('4. Deploy Production') {
            steps {
                sh "docker compose pull app"
                sh "docker compose up -d --no-deps app"
            }
        }
    }

    post {
        always {
            sh "docker logout || true"
        }
    }
}
```

### 5.3. Kết nối Webhook từ GitHub
* Với môi trường mạng nội bộ: Sử dụng **`ngrok`** hoặc **`smee.io`** để chuyển tiếp webhook từ GitHub về `http://localhost:8080/github-webhook/`.
* Mỗi khi thành viên trong nhóm thực hiện `git push origin main`, Jenkins sẽ tự động kích hoạt toàn bộ quy trình trên.

---

## 6. HƯỚNG DẪN VẬN HÀNH & KIỂM THỬ

### 6.1. Khởi chạy dự án lần đầu
```bash
cd ~/devops-project
docker compose up -d
```

### 6.2. Kiểm tra trạng thái các container
```bash
docker compose ps
```
*Kết quả chuẩn:*
* `devops_nginx`: Up (Port `0.0.0.0:80->80/tcp`)
* `devops_app`: Up (Port `3000/tcp`)
* `devops_mysql`: Up (healthy)

### 6.3. Truy cập ứng dụng & Tương tác nhiều thành viên
* **Trên máy Ubuntu chính (Host):** `http://localhost`
* **Trên máy Ubuntu thành viên khác (cùng mạng LAN/Wi-Fi):** `http://172.26.92.9`
* Đăng nhập 2 tài khoản: `dang.2006.qt@gmail.com` và `nhan@gmail.com` để thử nghiệm tương tác gửi tin nhắn và kết bạn hai chiều.

---

## 7. KỊCH BẢN DEMO BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG

1. **Chứng minh kiến trúc Docker & Phân tách dịch vụ:**
   * Mở trình duyệt `http://localhost` và `http://172.26.92.9` xem giao diện GreenChat.
   * Gửi tin nhắn giữa hai tài khoản qua mạng nội bộ Ubuntu (chứng minh Nginx Reverse Proxy và Node.js hoạt động).
   * Chạy lệnh `docker compose restart app` -> F5 lại web: Toàn bộ tin nhắn và tài khoản vẫn còn nguyên (chứng minh Named Volume `mysql_data` hoạt động bảo toàn dữ liệu).
2. **Chứng minh tự động hóa CI/CD:**
   * Mở VS Code, sửa phiên bản trong `app/server.js` từ `const APP_VERSION = "v1.0.0";` thành `"v2.0.0"`.
   * Thực hiện:
     ```bash
     git commit -am "release: bump version to v2.0.0"
     git push origin main
     ```
   * Chuyển sang màn hình Jenkins: Xem pipeline tự động kích hoạt qua 4 stages.
   * Chuyển sang Docker Hub: Thấy image mới vừa được đẩy lên.
   * Quay lại `http://localhost` và nhấn F5: Web đã tự động nhảy lên phiên bản **v2.0.0** mà các tài khoản và lịch sử chat trước đó không hề bị mất.
