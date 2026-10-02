const express = require('express');
const mysql = require('mysql2');
const os = require('os');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Kết nối MySQL với connection pool và charset utf8mb4
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret123',
    database: process.env.DB_NAME || 'devops_db',
    charset: 'utf8mb4'
});

// THÔNG TIN PHIÊN BẢN (Dùng cho CI/CD Demo)
const APP_VERSION = "v1.0.0";

// Thông tin người dùng hiện tại (Current Logged-in User)
const CURRENT_USER = {
    name: "Đặng Tuấn",
    handle: "tuss.devops",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces"
};

// Hàm tính thời gian tương đối
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Vừa xong";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Truy vấn lấy danh sách posts và comments
    db.query('SELECT * FROM posts ORDER BY id DESC', (err, posts) => {
        if (err) {
            return res.status(500).send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h2>Đang chờ cơ sở dữ liệu MySQL...</h2>
                    <p>Vui lòng đợi 5-10 giây rồi tải lại trang.</p>
                    <small style="color: red;">${err.message}</small>
                </div>
            `);
        }

        db.query('SELECT * FROM comments ORDER BY id ASC', (err, comments) => {
            const commentsByPost = {};
            (comments || []).forEach(c => {
                if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
                commentsByPost[c.post_id].push(c);
            });

            // Render từng Post Card
            const postCards = (posts || []).map(p => {
                const postComments = commentsByPost[p.id] || [];
                const feelingHtml = p.feeling ? `<span class="text-slate-500 font-normal"> • ${p.feeling}</span>` : '';
                const imageHtml = p.image_url ? `
                    <div class="mt-3 -mx-4 border-y border-slate-100 overflow-hidden bg-slate-900">
                        <img src="${p.image_url}" alt="Post image" class="w-full max-h-[480px] object-cover hover:opacity-95 transition-opacity">
                    </div>
                ` : '';

                const commentListHtml = postComments.map(c => `
                    <div class="flex items-start gap-2.5 text-xs group">
                        <img src="${c.author_avatar}" class="w-8 h-8 rounded-full object-cover mt-0.5 ring-1 ring-slate-200">
                        <div class="flex-1">
                            <div class="bg-[#f0f2f5] rounded-2xl px-3 py-2 inline-block max-w-[90%]">
                                <span class="font-semibold text-slate-900 block hover:underline cursor-pointer">${c.author_name}</span>
                                <span class="text-slate-800 text-[13px] leading-relaxed">${c.content}</span>
                            </div>
                            <div class="text-[11px] text-slate-400 pl-3 mt-0.5 flex gap-3">
                                <span>${timeAgo(c.created_at)}</span>
                                <button class="hover:underline font-semibold text-slate-500">Thích</button>
                                <button class="hover:underline font-semibold text-slate-500">Phản hồi</button>
                            </div>
                        </div>
                    </div>
                `).join('');

                return `
                    <article id="post-${p.id}" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all hover:shadow-md">
                        <!-- Post Header -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <img src="${p.author_avatar}" class="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200">
                                <div>
                                    <h4 class="font-semibold text-slate-900 text-sm hover:underline cursor-pointer">
                                        ${p.author_name} ${feelingHtml}
                                    </h4>
                                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                                        <span>${timeAgo(p.created_at)}</span>
                                        <span>•</span>
                                        <span title="Công khai">🌐</span>
                                    </div>
                                </div>
                            </div>

                            <form method="POST" action="/posts/delete" onsubmit="return confirm('Bạn có chắc chắn muốn xóa bài viết này?');">
                                <input type="hidden" name="id" value="${p.id}">
                                <button type="submit" class="text-slate-400 hover:text-rose-600 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Xóa bài viết">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </form>
                        </div>

                        <!-- Post Body -->
                        <div class="mt-3 text-slate-900 text-[14px] leading-relaxed whitespace-pre-line">
                            ${p.content}
                        </div>

                        <!-- Attached Media -->
                        ${imageHtml}

                        <!-- Counts / Metrics -->
                        <div class="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-1.5">
                                <span class="bg-[#1877F2] text-white p-1 rounded-full text-[10px] w-4 h-4 flex items-center justify-center">👍</span>
                                <span class="hover:underline cursor-pointer font-medium">${p.likes_count} lượt thích</span>
                            </div>
                            <div class="flex gap-3">
                                <span>${postComments.length} bình luận</span>
                                <span>1 lượt chia sẻ</span>
                            </div>
                        </div>

                        <!-- Action Buttons (Like / Comment / Share) -->
                        <div class="grid grid-cols-3 gap-1 py-1 border-b border-slate-100 text-xs font-semibold text-slate-600">
                            <form method="POST" action="/posts/like" class="m-0">
                                <input type="hidden" name="id" value="${p.id}">
                                <button type="submit" class="w-full py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 text-slate-600 hover:text-[#1877F2] transition-colors">
                                    <span>👍</span> Thích
                                </button>
                            </form>
                            <button onclick="document.getElementById('comment-input-${p.id}').focus()" class="py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <span>💬</span> Bình luận
                            </button>
                            <button onclick="alert('Đã sao chép liên kết bài viết!')" class="py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <span>↗️</span> Chia sẻ
                            </button>
                        </div>

                        <!-- Comments Section -->
                        <div class="mt-3 space-y-3">
                            ${commentListHtml}

                            <!-- New Comment Input Form -->
                            <form method="POST" action="/comments" class="flex items-center gap-2 pt-1">
                                <input type="hidden" name="post_id" value="${p.id}">
                                <img src="${CURRENT_USER.avatar}" class="w-8 h-8 rounded-full object-cover">
                                <div class="flex-1 relative">
                                    <input type="text" id="comment-input-${p.id}" name="content" placeholder="Viết bình luận công khai..." required
                                        class="w-full bg-[#f0f2f5] text-xs px-3.5 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#1877F2] pr-10">
                                    <button type="submit" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1877F2] font-semibold text-xs hover:opacity-80">
                                        Gửi
                                    </button>
                                </div>
                            </form>
                        </div>
                    </article>
                `;
            }).join('');

            res.send(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Pulse - Mạng xã hội nhóm DevOps</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f0f2f5; }
                    </style>
                </head>
                <body class="text-slate-900 min-h-screen">

                    <!-- Facebook Style Top Navigation -->
                    <nav class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs px-4 h-14 flex items-center justify-between">
                        <!-- Left: Brand Logo & Search -->
                        <div class="flex items-center gap-3 w-1/4">
                            <div class="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-2xl shadow-sm cursor-pointer">
                                f
                            </div>
                            <div class="relative hidden sm:block w-56">
                                <input type="text" placeholder="Tìm kiếm trên Pulse..." 
                                    class="w-full bg-[#f0f2f5] text-xs rounded-full py-2 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-[#1877F2]">
                                <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                            </div>
                        </div>

                        <!-- Center: Primary App Tabs -->
                        <div class="flex items-center justify-center gap-8 h-full flex-1 max-w-md">
                            <a href="/" class="h-full border-b-[3px] border-[#1877F2] text-[#1877F2] flex items-center px-6" title="Bảng tin">
                                <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                            </a>
                            <button class="h-full text-slate-500 hover:bg-slate-100 flex items-center px-6 rounded-lg transition-colors" title="Video">
                                <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
                            </button>
                            <button class="h-full text-slate-500 hover:bg-slate-100 flex items-center px-6 rounded-lg transition-colors" title="Nhóm">
                                <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            </button>
                        </div>

                        <!-- Right: User & Status Controls -->
                        <div class="flex items-center justify-end gap-3 w-1/4">
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1877F2]">${APP_VERSION}</span>
                            <span class="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono hidden md:inline">
                                host: ${os.hostname().slice(0, 8)}
                            </span>
                            <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
                                <img src="${CURRENT_USER.avatar}" class="w-9 h-9 rounded-full object-cover ring-2 ring-[#1877F2] cursor-pointer">
                                <span class="font-semibold text-xs text-slate-800 hidden lg:inline">${CURRENT_USER.name}</span>
                            </div>
                        </div>
                    </nav>

                    <!-- Main Container (3-Column Layout Like Facebook) -->
                    <div class="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 md:grid-cols-12 gap-6">

                        <!-- LEFT SIDEBAR (Shortcuts & Profile) -->
                        <aside class="hidden md:block md:col-span-3 space-y-2 text-sm text-slate-700">
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-200 rounded-lg cursor-pointer font-semibold">
                                <img src="${CURRENT_USER.avatar}" class="w-9 h-9 rounded-full object-cover">
                                <span>${CURRENT_USER.name}</span>
                            </div>
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-200 rounded-lg cursor-pointer">
                                <span class="text-xl">👥</span> <span>Bạn bè (42)</span>
                            </div>
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-200 rounded-lg cursor-pointer">
                                <span class="text-xl">👥</span> <span>Nhóm DevOps LOQ-15</span>
                            </div>
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-200 rounded-lg cursor-pointer">
                                <span class="text-xl">🔖</span> <span>Đã lưu</span>
                            </div>
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-200 rounded-lg cursor-pointer">
                                <span class="text-xl">⚙️</span> <span>Cài đặt hệ thống</span>
                            </div>
                            <hr class="border-slate-200 my-3">
                            <div class="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                                <span class="font-bold text-slate-900 block">Stack Hạ Tầng:</span>
                                <div class="text-slate-600 space-y-1">
                                    <p>• Reverse Proxy: <b>Nginx :80</b></p>
                                    <p>• Database: <b>MySQL 8.0</b></p>
                                    <p>• Automation: <b>Jenkins CI/CD</b></p>
                                </div>
                            </div>
                        </aside>

                        <!-- CENTER FEED (Stories, Composer, Posts) -->
                        <main class="col-span-1 md:col-span-9 lg:col-span-6 space-y-4 max-w-xl mx-auto w-full">

                            <!-- Stories Bar -->
                            <div class="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                                <div class="relative w-28 h-44 rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200 flex-shrink-0 cursor-pointer group">
                                    <img src="${CURRENT_USER.avatar}" class="w-full h-32 object-cover group-hover:scale-105 transition-transform">
                                    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1877F2] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold ring-4 ring-white text-sm">
                                        +
                                    </div>
                                    <span class="absolute bottom-1.5 inset-x-0 text-center font-semibold text-[11px] text-slate-800">Tạo tin</span>
                                </div>
                                <div class="relative w-28 h-44 rounded-xl overflow-hidden shadow-sm flex-shrink-0 cursor-pointer group">
                                    <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&h=450&fit=crop" class="w-full h-full object-cover group-hover:scale-105 transition-transform brightness-90">
                                    <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&h=80&fit=crop" class="absolute top-2 left-2 w-8 h-8 rounded-full ring-2 ring-[#1877F2]">
                                    <span class="absolute bottom-2 left-2 right-2 text-white font-semibold text-xs drop-shadow">Hoàng Nam</span>
                                </div>
                                <div class="relative w-28 h-44 rounded-xl overflow-hidden shadow-sm flex-shrink-0 cursor-pointer group">
                                    <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=450&fit=crop" class="w-full h-full object-cover group-hover:scale-105 transition-transform brightness-90">
                                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop" class="absolute top-2 left-2 w-8 h-8 rounded-full ring-2 ring-[#1877F2]">
                                    <span class="absolute bottom-2 left-2 right-2 text-white font-semibold text-xs drop-shadow">Minh Anh</span>
                                </div>
                            </div>

                            <!-- Post Composer Box (Chuẩn Facebook) -->
                            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <form method="POST" action="/posts" class="space-y-3">
                                    <div class="flex items-center gap-3">
                                        <img src="${CURRENT_USER.avatar}" class="w-10 h-10 rounded-full object-cover">
                                        <input type="text" name="content" placeholder="${CURRENT_USER.name} ơi, bạn đang nghĩ gì thế?" required
                                            class="w-full bg-[#f0f2f5] hover:bg-slate-200 text-sm px-4 py-2.5 rounded-full focus:outline-none focus:ring-1 focus:ring-[#1877F2] transition-colors">
                                    </div>

                                    <!-- Optional Attachments Accordion -->
                                    <div class="grid grid-cols-2 gap-2 pt-2">
                                        <input type="url" name="image_url" placeholder="Dán link ảnh đính kèm (URL)..."
                                            class="w-full bg-[#f0f2f5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1877F2]">
                                        <input type="text" name="feeling" placeholder="Cảm xúc (vd: đang hào hứng 🚀)"
                                            class="w-full bg-[#f0f2f5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1877F2]">
                                    </div>

                                    <hr class="border-slate-100">

                                    <div class="flex items-center justify-between pt-1">
                                        <div class="flex gap-4 text-xs font-semibold text-slate-500">
                                            <span class="flex items-center gap-1.5 cursor-pointer hover:text-emerald-600">
                                                <span>🖼️</span> Ảnh/video
                                            </span>
                                            <span class="flex items-center gap-1.5 cursor-pointer hover:text-amber-500">
                                                <span>😄</span> Cảm xúc
                                            </span>
                                        </div>
                                        <button type="submit" 
                                            class="bg-[#1877F2] hover:bg-blue-600 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-sm transition-colors">
                                            Đăng bài
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <!-- Posts Feed -->
                            <div class="space-y-4">
                                ${postCards.length ? postCards : '<div class="bg-white p-8 rounded-xl text-center text-slate-400">Bảng tin trống. Hãy đăng bài đầu tiên!</div>'}
                            </div>

                        </main>

                        <!-- RIGHT SIDEBAR (Online Friends / Contacts) -->
                        <aside class="hidden lg:block lg:col-span-3 space-y-4">
                            <div class="p-3 bg-white rounded-xl border border-slate-200">
                                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Người liên hệ</h4>
                                <ul class="space-y-3 text-xs">
                                    <li class="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                                        <div class="flex items-center gap-2.5">
                                            <div class="relative">
                                                <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&h=80&fit=crop" class="w-8 h-8 rounded-full object-cover">
                                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                            </div>
                                            <span class="font-semibold text-slate-800">Lê Hoàng Nam</span>
                                        </div>
                                        <span class="text-[10px] text-slate-400">DevOps</span>
                                    </li>
                                    <li class="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                                        <div class="flex items-center gap-2.5">
                                            <div class="relative">
                                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop" class="w-8 h-8 rounded-full object-cover">
                                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                            </div>
                                            <span class="font-semibold text-slate-800">Trần Minh Anh</span>
                                        </div>
                                        <span class="text-[10px] text-slate-400">Frontend</span>
                                    </li>
                                    <li class="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                                        <div class="flex items-center gap-2.5">
                                            <div class="relative">
                                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" class="w-8 h-8 rounded-full object-cover">
                                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                            </div>
                                            <span class="font-semibold text-slate-800">Nguyễn Quốc Huy</span>
                                        </div>
                                        <span class="text-[10px] text-slate-400">Database</span>
                                    </li>
                                </ul>
                            </div>
                        </aside>

                    </div>

                </body>
                </html>
            `);
        });
    });
});

// Thêm bài viết mới
app.post('/posts', (req, res) => {
    const { content, image_url, feeling } = req.body;
    db.query(
        'INSERT INTO posts (author_name, author_avatar, content, image_url, feeling) VALUES (?, ?, ?, ?, ?)',
        [CURRENT_USER.name, CURRENT_USER.avatar, content, image_url || '', feeling || ''],
        () => res.redirect('/')
    );
});

// Thêm bình luận
app.post('/comments', (req, res) => {
    const { post_id, content } = req.body;
    db.query(
        'INSERT INTO comments (post_id, author_name, author_avatar, content) VALUES (?, ?, ?, ?)',
        [post_id, CURRENT_USER.name, CURRENT_USER.avatar, content],
        () => res.redirect(`/#post-${post_id}`)
    );
});

// Thích bài viết
app.post('/posts/like', (req, res) => {
    const { id } = req.body;
    db.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [id], () => res.redirect(`/#post-${id}`));
});

// Xóa bài viết
app.post('/posts/delete', (req, res) => {
    const { id } = req.body;
    db.query('DELETE FROM posts WHERE id = ?', [id], () => res.redirect('/'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Facebook-style App running on port ${PORT}`));
