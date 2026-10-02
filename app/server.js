const express = require('express');
const mysql = require('mysql2');
const os = require('os');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Kết nối MySQL với pool và utf8mb4
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret123',
    database: process.env.DB_NAME || 'devops_db',
    charset: 'utf8mb4'
});

// PHIÊN BẢN ỨNG DỤNG (Dùng để demo nâng cấp CI/CD sau này: v1.0 -> v2.0)
const APP_VERSION = "v1.0.0";

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    db.query('SELECT * FROM posts ORDER BY id DESC', (err, posts) => {
        if (err) {
            return res.status(500).send(`
                <div style="font-family: system-ui, sans-serif; padding: 40px; text-align: center;">
                    <h2>Đang khởi động kết nối Database...</h2>
                    <p>Vui lòng đợi vài giây và tải lại trang.</p>
                </div>
            `);
        }

        const postItems = (posts || []).map(p => {
            const avatar = p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.author_name)}`;
            const dateStr = new Date(p.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            
            return `
                <article class="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <img src="${avatar}" alt="${p.author_name}" class="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200">
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <h3 class="font-semibold text-slate-900 text-sm">${p.author_name}</h3>
                                    <span class="text-xs text-slate-400">@${p.author_handle}</span>
                                </div>
                                <time class="text-xs text-slate-400">${dateStr}</time>
                            </div>
                        </div>
                        
                        <form method="POST" action="/posts/delete" onsubmit="return confirm('Bạn có chắc muốn xóa bài viết này?');">
                            <input type="hidden" name="id" value="${p.id}">
                            <button type="submit" class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-xs font-medium" title="Xóa bài">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </form>
                    </div>

                    <p class="mt-3.5 text-slate-800 text-[15px] leading-relaxed whitespace-pre-line">${p.content}</p>

                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs">
                        <form method="POST" action="/posts/like" class="inline">
                            <input type="hidden" name="id" value="${p.id}">
                            <button type="submit" class="inline-flex items-center gap-1.5 hover:text-rose-600 font-medium transition-colors group">
                                <svg class="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                <span>${p.likes_count} lượt thích</span>
                            </button>
                        </form>
                        <span class="text-slate-400">ID #${p.id}</span>
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
                <title>Pulse - Nền tảng chia sẻ thông tin</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; }
                </style>
            </head>
            <body class="bg-slate-50 text-slate-900 min-h-screen">
                <!-- Navigation Bar -->
                <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                P
                            </div>
                            <span class="text-lg font-bold tracking-tight text-slate-900">Pulse</span>
                            <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">${APP_VERSION}</span>
                        </div>

                        <div class="flex items-center gap-4 text-xs text-slate-500">
                            <span class="hidden sm:inline">Server: <code class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">${os.hostname()}</code></span>
                            <span class="flex items-center gap-1 text-emerald-600 font-medium">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                            </span>
                        </div>
                    </div>
                </header>

                <!-- Main Content Area -->
                <main class="max-w-4xl mx-auto px-4 py-8">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        <!-- Left & Center: Feed -->
                        <div class="md:col-span-2 space-y-5">
                            
                            <!-- Post Composer Box -->
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <form method="POST" action="/posts" class="space-y-4">
                                    <div class="grid grid-cols-2 gap-3">
                                        <input type="text" name="author_name" placeholder="Họ và tên của bạn" required
                                            class="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all">
                                        <input type="text" name="author_handle" placeholder="username (vd: tuan_dev)" required
                                            class="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all">
                                    </div>
                                    
                                    <textarea name="content" rows="3" placeholder="Chia sẻ suy nghĩ hoặc cập nhật mới của bạn..." required
                                        class="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all resize-none"></textarea>

                                    <div class="flex items-center justify-between pt-1">
                                        <span class="text-xs text-slate-400">Dữ liệu được lưu trữ tự động vào MySQL</span>
                                        <button type="submit" 
                                            class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
                                            Đăng bài
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <!-- Post Feed List -->
                            <div class="space-y-4">
                                ${postItems.length ? postItems : '<div class="text-center py-12 text-slate-400 text-sm">Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!</div>'}
                            </div>
                        </div>

                        <!-- Right Sidebar: Info Widget -->
                        <aside class="space-y-5 hidden md:block">
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Kiến trúc hệ thống</h4>
                                <ul class="space-y-3 text-xs text-slate-600">
                                    <li class="flex items-center justify-between">
                                        <span>Reverse Proxy</span>
                                        <span class="font-semibold text-slate-800">Nginx (Port 80)</span>
                                    </li>
                                    <li class="flex items-center justify-between">
                                        <span>Backend</span>
                                        <span class="font-semibold text-slate-800">Node.js Express</span>
                                    </li>
                                    <li class="flex items-center justify-between">
                                        <span>Database</span>
                                        <span class="font-semibold text-slate-800">MySQL 8.0</span>
                                    </li>
                                    <li class="flex items-center justify-between">
                                        <span>Môi trường</span>
                                        <span class="font-semibold text-slate-800">Docker on Ubuntu</span>
                                    </li>
                                </ul>
                            </div>

                            <div class="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-2">
                                <h5 class="text-sm font-semibold">DevOps CI/CD Flow</h5>
                                <p class="text-xs text-slate-300 leading-relaxed">
                                    Mọi thay đổi code được đẩy qua Git sẽ được Jenkins tự động build, test và deploy mà không làm gián đoạn hệ thống.
                                </p>
                            </div>
                        </aside>

                    </div>
                </main>
            </body>
            </html>
        `);
    });
});

app.post('/posts', (req, res) => {
    const { author_name, author_handle, content } = req.body;
    db.query(
        'INSERT INTO posts (author_name, author_handle, content) VALUES (?, ?, ?)',
        [author_name, author_handle.replace(/^@/, ''), content],
        () => res.redirect('/')
    );
});

app.post('/posts/like', (req, res) => {
    const { id } = req.body;
    db.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [id], () => res.redirect('/'));
});

app.post('/posts/delete', (req, res) => {
    const { id } = req.body;
    db.query('DELETE FROM posts WHERE id = ?', [id], () => res.redirect('/'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pulse Social App running on port ${PORT}`));
