const express = require('express');
const mysql = require('mysql2');
const os = require('os');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Kết nối MySQL pool với charset utf8mb4
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret123',
    database: process.env.DB_NAME || 'devops_db',
    charset: 'utf8mb4'
});

const APP_VERSION = "v1.0.0";

// Helper: Phân tích cookie
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;
    if (rc) {
        rc.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            if (parts.length >= 2) {
                list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
            }
        });
    }
    return list;
}

// Middleware: Xác thực người dùng
function authMiddleware(req, res, next) {
    const cookies = parseCookies(req);
    const userId = cookies.greenchat_uid;
    if (!userId) {
        req.user = null;
        return next();
    }
    db.query('SELECT id, email, full_name, avatar_url, bio, status FROM users WHERE id = ?', [userId], (err, results) => {
        if (!err && results.length > 0) {
            req.user = results[0];
        } else {
            req.user = null;
        }
        next();
    });
}

app.use(authMiddleware);

// ==================== AUTHENTICATION (GMAIL) ====================

app.get('/login', (req, res) => {
    if (req.user) return res.redirect('/');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const errorMsg = req.query.error ? decodeURIComponent(req.query.error) : '';
    const successMsg = req.query.success ? decodeURIComponent(req.query.success) : '';

    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GreenChat - Đăng nhập tài khoản</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #ecfdf5; }
            </style>
        </head>
        <body class="min-h-screen flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 space-y-6">
                
                <div class="text-center space-y-2">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-3xl shadow-lg shadow-emerald-600/30">
                        🌿
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800">GreenChat</h2>
                    <p class="text-xs text-emerald-700 font-medium">Hệ thống nhắn tin & kết bạn qua Gmail</p>
                </div>

                ${errorMsg ? `<div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">${errorMsg}</div>` : ''}
                ${successMsg ? `<div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">${successMsg}</div>` : ''}

                <div class="flex border-b border-emerald-100 text-sm font-semibold">
                    <button id="tab-login-btn" onclick="showTab('login')" class="flex-1 pb-3 text-emerald-600 border-b-2 border-emerald-600 transition-colors">
                        Đăng nhập
                    </button>
                    <button id="tab-register-btn" onclick="showTab('register')" class="flex-1 pb-3 text-slate-400 hover:text-slate-700 transition-colors">
                        Đăng ký Gmail
                    </button>
                </div>

                <!-- Form Đăng nhập -->
                <form id="form-login" method="POST" action="/login" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ Gmail</label>
                        <input type="email" name="email" placeholder="example@gmail.com" required
                            class="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
                        <input type="password" name="password" placeholder="Nhập mật khẩu" required
                            class="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                    </div>

                    <button type="submit" 
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20">
                        Đăng nhập ngay
                    </button>
                </form>

                <!-- Form Đăng ký -->
                <form id="form-register" method="POST" action="/register" class="space-y-3.5 hidden">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Họ và tên của bạn</label>
                        <input type="text" name="full_name" placeholder="Nguyễn Văn A" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Gmail cá nhân</label>
                        <input type="email" name="email" placeholder="tentaikhoan@gmail.com" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
                        <input type="password" name="password" placeholder="Tạo mật khẩu" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <button type="submit" 
                        class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md">
                        Tạo tài khoản GreenChat
                    </button>
                </form>

                <div class="text-center text-xs text-slate-400">
                    Ứng dụng vận hành trên Docker Ubuntu • MySQL
                </div>

            </div>

            <script>
                function showTab(tab) {
                    const formLogin = document.getElementById('form-login');
                    const formRegister = document.getElementById('form-register');
                    const btnLogin = document.getElementById('tab-login-btn');
                    const btnRegister = document.getElementById('tab-register-btn');

                    if (tab === 'login') {
                        formLogin.classList.remove('hidden');
                        formRegister.classList.add('hidden');
                        btnLogin.className = 'flex-1 pb-3 text-emerald-600 border-b-2 border-emerald-600';
                        btnRegister.className = 'flex-1 pb-3 text-slate-400 hover:text-slate-700';
                    } else {
                        formLogin.classList.add('hidden');
                        formRegister.classList.remove('hidden');
                        btnRegister.className = 'flex-1 pb-3 text-emerald-600 border-b-2 border-emerald-600';
                        btnLogin.className = 'flex-1 pb-3 text-slate-400 hover:text-slate-700';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email.trim().toLowerCase(), password], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/login?error=' + encodeURIComponent('Địa chỉ Gmail hoặc mật khẩu không chính xác!'));
        }
        res.setHeader('Set-Cookie', `greenchat_uid=${results[0].id}; Path=/; HttpOnly`);
        res.redirect('/');
    });
});

app.post('/register', (req, res) => {
    const { full_name, email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const avatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanEmail)}`;

    db.query(
        'INSERT INTO users (full_name, email, password, avatar_url) VALUES (?, ?, ?, ?)',
        [full_name, cleanEmail, password, avatar],
        (err, result) => {
            if (err) {
                return res.redirect('/login?error=' + encodeURIComponent('Gmail này đã được đăng ký, vui lòng dùng Gmail khác!'));
            }
            res.setHeader('Set-Cookie', `greenchat_uid=${result.insertId}; Path=/; HttpOnly`);
            res.redirect('/');
        }
    );
});

app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'greenchat_uid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/login');
});

// ==================== BACKEND ROUTE: TRANG BẠN BÈ VÀ KẾT BẠN ====================

app.get('/friends', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const searchQuery = (req.query.search || '').trim();
    const alertMsg = req.query.msg || '';

    // 1. Lấy danh sách bạn bè hiện tại của user
    const friendsSql = `
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ?
        ORDER BY u.full_name ASC
    `;

    db.query(friendsSql, [req.user.id], (err, friends) => {
        // 2. Nếu có tìm kiếm -> thực hiện query tìm kiếm người dùng trong MySQL
        let searchResults = null;

        const renderPage = (searchResults) => {
            res.send(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>GreenChat - Quản lý Bạn bè & Kết bạn</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f0fdf4; }
                    </style>
                </head>
                <body class="h-screen flex overflow-hidden">

                    <!-- CỘT THANH ĐIỀU HƯỚNG BÊN TRÁI -->
                    <nav class="w-16 bg-emerald-700 flex flex-col items-center py-4 justify-between flex-shrink-0 z-30 shadow-md">
                        <div class="flex flex-col items-center gap-5 w-full">
                            <a href="/" class="w-11 h-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer" title="GreenChat">
                                🌿
                            </a>
                            <a href="/" class="w-11 h-11 rounded-xl hover:bg-white/10 text-white/80 flex flex-col items-center justify-center text-sm transition-all" title="Tin nhắn">
                                <span class="text-lg">💬</span>
                                <span class="text-[9px] font-semibold">Chat</span>
                            </a>
                            <a href="/friends" class="w-11 h-11 rounded-xl bg-white/20 text-white flex flex-col items-center justify-center text-sm transition-all" title="Bạn bè">
                                <span class="text-lg">👥</span>
                                <span class="text-[9px] font-semibold">Bạn bè</span>
                            </a>
                        </div>

                        <div class="flex flex-col items-center gap-4">
                            <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">${APP_VERSION}</span>
                            <a href="/logout" title="Đăng xuất" class="text-white/80 hover:text-white p-2 text-lg">
                                🚪
                            </a>
                        </div>
                    </nav>

                    <!-- TOÀN BỘ NỘI DUNG TRANG BẠN BÈ (RENDER TRỰC TIẾP TỪ BACKEND) -->
                    <div class="flex-1 flex flex-col overflow-y-auto">
                        
                        <div class="max-w-4xl w-full mx-auto p-6 space-y-6">
                            
                            <!-- Header thông tin -->
                            <div class="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <img src="${req.user.avatar_url}" class="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-600">
                                    <div>
                                        <h2 class="text-xl font-bold text-slate-800">Quản lý Bạn bè & Thêm bạn qua Gmail</h2>
                                        <p class="text-xs text-slate-500">Đang đăng nhập: <b>${req.user.full_name}</b> (${req.user.email})</p>
                                    </div>
                                </div>
                                <a href="/" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5">
                                    💬 Mở khung Chat
                                </a>
                            </div>

                            ${alertMsg === 'added' ? `
                                <div class="p-4 bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl shadow-xs">
                                    ✓ Đã thêm bạn bè thành công! Giờ đây bạn có thể bắt đầu nhắn tin với người này.
                                </div>
                            ` : ''}

                            ${alertMsg === 'removed' ? `
                                <div class="p-4 bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl shadow-xs">
                                    ✓ Đã hủy kết bạn thành công.
                                </div>
                            ` : ''}

                            <!-- KHUNG TÌM KIẾM BẠN BÈ QUA GMAIL -->
                            <div class="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                                <h3 class="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                                    <span>🔍</span> Tìm kiếm người dùng bằng Gmail
                                </h3>

                                <form method="GET" action="/friends" class="flex gap-2">
                                    <input type="text" name="search" value="${searchQuery}" 
                                        placeholder="Nhập địa chỉ Gmail cần tìm (ví dụ: nhan@gmail.com hoặc dang.2006.qt@gmail.com)..." required
                                        class="flex-1 text-sm px-4 py-3 bg-emerald-50/40 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 transition-all">
                                    <button type="submit" 
                                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm">
                                        Tìm kiếm
                                    </button>
                                </form>

                                <!-- KẾT QUẢ TÌM KIẾM HIỆN RA TẠI ĐÂY -->
                                <div class="pt-2">
                                    ${searchQuery ? (
                                        searchResults && searchResults.length > 0 ? `
                                            <div class="space-y-3">
                                                <p class="text-xs text-slate-500 font-semibold">Kết quả tìm kiếm cho: <b>"${searchQuery}"</b> (${searchResults.length} người)</p>
                                                ${searchResults.map(u => `
                                                    <div class="flex items-center justify-between p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 shadow-2xs">
                                                        <div class="flex items-center gap-3.5">
                                                            <img src="${u.avatar_url}" class="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-600">
                                                            <div>
                                                                <span class="font-bold text-sm text-slate-800 block">${u.full_name}</span>
                                                                <span class="text-xs text-slate-500 block">${u.email}</span>
                                                            </div>
                                                        </div>
                                                        <div class="flex items-center gap-2">
                                                            ${!u.is_friend ? `
                                                                <form method="POST" action="/friends/add" class="m-0">
                                                                    <input type="hidden" name="friend_id" value="${u.id}">
                                                                    <input type="hidden" name="search" value="${searchQuery}">
                                                                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs">
                                                                        ➕ Kết bạn
                                                                    </button>
                                                                </form>
                                                            ` : `
                                                                <span class="text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1.5 rounded-xl">
                                                                    ✓ Đã là bạn bè
                                                                </span>
                                                            `}
                                                            
                                                            <form method="POST" action="/chat/start" class="m-0">
                                                                <input type="hidden" name="user_id" value="${u.id}">
                                                                <button type="submit" class="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs">
                                                                    💬 Nhắn tin
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                                Không tìm thấy tài khoản nào khớp với Gmail: <b>${searchQuery}</b>. Vui lòng kiểm tra lại chính tả!
                                            </div>
                                        `
                                    ) : `
                                        <p class="text-xs text-slate-400 italic">Nhập Gmail vào ô trên và bấm Tìm kiếm để kết bạn.</p>
                                    `}
                                </div>
                            </div>

                            <!-- DANH SÁCH BẠN BÈ HIỆN TẠI -->
                            <div class="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 class="text-sm font-bold text-emerald-800 uppercase tracking-wider">
                                        Danh sách bạn bè đã kết bạn (${friends ? friends.length : 0})
                                    </h3>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    ${friends && friends.length > 0 ? friends.map(f => `
                                        <div class="flex items-center justify-between p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <img src="${f.avatar_url}" class="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-600">
                                                <div class="min-w-0">
                                                    <span class="font-bold text-xs text-slate-800 block truncate">${f.full_name}</span>
                                                    <span class="text-[11px] text-slate-500 block truncate">${f.email}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <form method="POST" action="/chat/start" class="m-0">
                                                    <input type="hidden" name="user_id" value="${f.id}">
                                                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors">
                                                        Nhắn tin
                                                    </button>
                                                </form>
                                                <form method="POST" action="/friends/remove" onsubmit="return confirm('Bạn có chắc muốn hủy kết bạn?');" class="m-0">
                                                    <input type="hidden" name="friend_id" value="${f.id}">
                                                    <button type="submit" class="text-rose-500 hover:bg-rose-50 text-xs px-2 py-1.5 rounded-lg font-semibold" title="Hủy kết bạn">
                                                        ✕
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div class="col-span-2 text-center py-8 text-slate-400 text-xs">
                                            Bạn chưa có bạn bè nào. Hãy sử dụng ô tìm kiếm ở trên để kết bạn!
                                        </div>
                                    `}
                                </div>
                            </div>

                        </div>

                    </div>

                </body>
                </html>
            `);
        };

        if (searchQuery) {
            const searchSql = `
                SELECT u.id, u.email, u.full_name, u.avatar_url,
                       IF(f.id IS NOT NULL, 1, 0) AS is_friend
                FROM users u
                LEFT JOIN friendships f ON (f.user_id = ? AND f.friend_id = u.id)
                WHERE (u.email LIKE ? OR u.full_name LIKE ?) AND u.id != ?
                LIMIT 10
            `;
            db.query(searchSql, [req.user.id, `%${searchQuery}%`, `%${searchQuery}%`, req.user.id], (err, users) => {
                renderPage(users || []);
            });
        } else {
            renderPage(null);
        }
    });
});

// Helper: Tìm hoặc tạo cuộc trò chuyện 1-1
function getOrCreateDirectConversation(userId1, userId2, callback) {
    const checkSql = "SELECT c.id FROM conversations c JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ? JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ? WHERE c.type = 'direct' LIMIT 1";
    db.query(checkSql, [userId1, userId2], (err, results) => {
        if (!err && results && results.length > 0) {
            return callback(null, results[0].id);
        }
        db.query('INSERT INTO conversations (type, created_by) VALUES ("direct", ?)', [userId1], (err, convRes) => {
            if (err) return callback(err);
            const convId = convRes.insertId;
            db.query(
                'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)',
                [convId, userId1, convId, userId2],
                (err) => {
                    if (err) return callback(err);
                    callback(null, convId);
                }
            );
        });
    });
}

// Xử lý Thêm bạn (POST)
app.post('/friends/add', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const friendId = parseInt(req.body.friend_id);
    const search = req.body.search || '';

    if (!friendId || friendId === req.user.id) {
        return res.redirect('/friends');
    }

    const sql = 'INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)';
    db.query(sql, [req.user.id, friendId, friendId, req.user.id], () => {
        // Tự động tạo cuộc trò chuyện 1-1 để khi sang tab Chat có thể nhắn ngay!
        getOrCreateDirectConversation(req.user.id, friendId, () => {
            res.redirect('/friends?search=' + encodeURIComponent(search) + '&msg=added');
        });
    });
});

// Xử lý Hủy kết bạn (POST)
app.post('/friends/remove', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const friendId = parseInt(req.body.friend_id);

    const sql = 'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)';
    db.query(sql, [req.user.id, friendId, friendId, req.user.id], () => {
        res.redirect('/friends?msg=removed');
    });
});

// Bắt đầu chat 1-1 và chuyển sang màn hình Chat
app.post('/chat/start', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const targetUserId = parseInt(req.body.user_id);
    if (!targetUserId || targetUserId === req.user.id) return res.redirect('/');

    getOrCreateDirectConversation(req.user.id, targetUserId, (err, convId) => {
        if (err || !convId) return res.redirect('/');
        res.redirect('/?conv=' + convId);
    });
});

// Tạo nhóm chat mới
app.post('/groups/create', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const title = (req.body.title || '').trim();
    if (!title) return res.redirect('/');

    let members = req.body.members || [];
    if (!Array.isArray(members)) {
        members = [members];
    }
    const memberIds = members.map(m => parseInt(m)).filter(id => id && id !== req.user.id);

    db.query('INSERT INTO conversations (type, title, created_by) VALUES ("group", ?, ?)', [title, req.user.id], (err, convRes) => {
        if (err) return res.redirect('/');
        const convId = convRes.insertId;

        const inserts = [[convId, req.user.id]];
        memberIds.forEach(id => inserts.push([convId, id]));

        const placeholders = inserts.map(() => '(?, ?)').join(', ');
        const flatParams = inserts.reduce((acc, curr) => acc.concat(curr), []);

        db.query(`INSERT INTO conversation_members (conversation_id, user_id) VALUES ${placeholders}`, flatParams, () => {
            res.redirect('/?conv=' + convId);
        });
    });
});

// Gửi tin nhắn qua Standard HTTP POST (Đảm bảo 100% gửi được dù trình duyệt có bật JS hay không)
app.post('/chat/send', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const convId = parseInt(req.body.conversation_id);
    const content = (req.body.content || '').trim();
    const image_url = (req.body.image_url || '').trim();

    if (!convId || (!content && !image_url)) {
        return res.redirect(convId ? '/?conv=' + convId : '/');
    }

    db.query(
        'INSERT INTO messages (conversation_id, sender_id, content, image_url) VALUES (?, ?, ?, ?)',
        [convId, req.user.id, content, image_url],
        () => {
            res.redirect('/?conv=' + convId);
        }
    );
});

// ==================== MAIN CHAT VIEW (GET /) ====================

app.get('/', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // 1. Lấy danh sách cuộc trò chuyện
    const convSql = `
        SELECT c.id, c.type, c.title, c.created_at,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
               (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message_time,
               u.full_name AS direct_user_name,
               u.avatar_url AS direct_user_avatar,
               u.email AS direct_user_email
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = ?
        LEFT JOIN conversation_members cm_other ON c.id = cm_other.conversation_id AND cm_other.user_id != ? AND c.type = 'direct'
        LEFT JOIN users u ON cm_other.user_id = u.id
        ORDER BY COALESCE(last_message_time, c.created_at) DESC
    `;

    // 2. Lấy danh sách bạn bè
    const friendsSql = `
        SELECT u.id, u.email, u.full_name, u.avatar_url
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ?
        ORDER BY u.full_name ASC
    `;

    db.query(convSql, [req.user.id, req.user.id], (err, conversations) => {
        const convList = conversations || [];

        db.query(friendsSql, [req.user.id], (err2, friends) => {
            const friendList = friends || [];

            // Xác định conversation đang kích hoạt
            let reqConvId = parseInt(req.query.conv) || 0;
            let activeConv = null;

            if (reqConvId) {
                activeConv = convList.find(c => c.id === reqConvId);
            }
            if (!activeConv && convList.length > 0) {
                activeConv = convList[0];
            }

            const activeConvId = activeConv ? activeConv.id : 0;

            // Nếu có active conversation -> lấy luôn tin nhắn ban đầu để render SSR ngay lập tức
            if (activeConvId) {
                const msgSql = `
                    SELECT m.id, m.content, m.image_url, m.created_at, m.sender_id,
                           u.full_name AS sender_name, u.avatar_url AS sender_avatar
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.conversation_id = ?
                    ORDER BY m.id ASC
                `;
                db.query(msgSql, [activeConvId], (err3, initialMsgs) => {
                    renderChatPage(convList, friendList, activeConv, initialMsgs || []);
                });
            } else {
                renderChatPage(convList, friendList, null, []);
            }
        });
    });

    function renderChatPage(conversations, friends, activeConv, initialMessages) {
        const activeConvId = activeConv ? activeConv.id : 0;
        const isGroup = activeConv && activeConv.type === 'group';
        const activeTitle = activeConv ? (isGroup ? activeConv.title : (activeConv.direct_user_name || 'Người dùng')) : '';
        const activeAvatar = activeConv ? (isGroup ? '👥' : (activeConv.direct_user_avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=user')) : '';
        const activeStatus = activeConv ? (isGroup ? 'Nhóm trò chuyện' : (activeConv.direct_user_email || 'Trực tuyến')) : '';

        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>GreenChat - Trò chuyện ${activeTitle ? '- ' + activeTitle : ''}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f0fdf4; }
                </style>
            </head>
            <body class="h-screen flex overflow-hidden">

                <!-- 1. LEFT RAIL BAR -->
                <nav class="w-16 bg-emerald-700 flex flex-col items-center py-4 justify-between flex-shrink-0 z-30 shadow-md">
                    <div class="flex flex-col items-center gap-5 w-full">
                        <a href="/" class="w-11 h-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer" title="GreenChat">
                            🌿
                        </a>
                        <!-- Nút Chat (Active) -->
                        <a href="/" class="w-11 h-11 rounded-xl bg-white/20 text-white flex flex-col items-center justify-center text-sm transition-all" title="Tin nhắn">
                            <span class="text-lg">💬</span>
                            <span class="text-[9px] font-semibold">Chat</span>
                        </a>
                        <!-- Nút Bạn bè -->
                        <a href="/friends" class="w-11 h-11 rounded-xl hover:bg-white/10 text-white/80 flex flex-col items-center justify-center text-sm transition-all" title="Bạn bè & Kết bạn">
                            <span class="text-lg">👥</span>
                            <span class="text-[9px] font-semibold">Bạn bè</span>
                        </a>
                    </div>

                    <div class="flex flex-col items-center gap-4">
                        <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">${APP_VERSION}</span>
                        <a href="/logout" title="Đăng xuất" class="text-white/80 hover:text-white p-2 text-lg">
                            🚪
                        </a>
                    </div>
                </nav>

                <!-- 2. CỘT DANH SÁCH CUỘC TRÒ CHUYỆN & BẠN BÈ -->
                <div class="w-80 bg-white border-r border-emerald-100 flex flex-col flex-shrink-0">
                    <!-- User Header -->
                    <div class="p-3.5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/40">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <img src="${req.user.avatar_url}" class="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-600 flex-shrink-0">
                            <div class="min-w-0">
                                <h3 class="font-bold text-xs text-slate-800 truncate">${req.user.full_name}</h3>
                                <span class="text-[10px] text-emerald-700 font-semibold truncate block">${req.user.email}</span>
                            </div>
                        </div>
                        <a href="/friends" class="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex-shrink-0" title="Tìm và thêm bạn bè qua Gmail">
                            + Thêm bạn
                        </a>
                    </div>

                    <!-- Conversation Header Action -->
                    <div class="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span class="text-xs font-bold text-slate-700">Cuộc trò chuyện (${conversations.length})</span>
                        <button onclick="document.getElementById('group-modal').classList.remove('hidden')" 
                            class="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                            + Tạo nhóm
                        </button>
                    </div>

                    <!-- Scroll Area for Chats & Friends -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-3">
                        <!-- Danh sách cuộc trò chuyện -->
                        <div class="space-y-1">
                            ${conversations && conversations.length > 0 ? conversations.map(c => {
                                const isGrp = c.type === 'group';
                                const name = isGrp ? c.title : (c.direct_user_name || 'Người dùng');
                                const avatar = isGrp ? '👥' : (c.direct_user_avatar ? '<img src="' + c.direct_user_avatar + '" class="w-10 h-10 rounded-full object-cover">' : '👤');
                                const subText = c.last_message || (isGrp ? 'Nhóm trò chuyện' : c.direct_user_email);
                                const isCurrent = c.id === activeConvId;
                                const safeName = (name || '').replace(/'/g, "\\'");
                                const safeAvatar = isGrp ? '' : (c.direct_user_avatar || '');

                                return `
                                    <div onclick="selectConversation(${c.id}, '${safeName}', '${isGrp ? 'group' : 'direct'}', '${safeAvatar}')"
                                         id="conv-item-${c.id}"
                                         class="conv-card flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border-l-4 ${isCurrent ? 'bg-emerald-50/90 border-emerald-600 shadow-xs' : 'border-transparent hover:bg-slate-50'}">
                                        <div class="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center flex-shrink-0 text-lg">
                                            ${avatar}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex justify-between items-baseline">
                                                <h4 class="text-xs font-bold text-slate-800 truncate">${name}</h4>
                                            </div>
                                            <p class="text-[11px] text-slate-500 truncate mt-0.5">${subText}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('') : `
                                <div class="text-center py-6 px-3 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200 text-xs text-slate-500 space-y-2">
                                    <p>Chưa có hội thoại nào.</p>
                                    <a href="/friends" class="inline-block bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
                                        Tìm bạn qua Gmail
                                    </a>
                                </div>
                            `}
                        </div>

                        <!-- Danh sách Bạn bè nhanh -->
                        ${friends && friends.length > 0 ? `
                            <div class="pt-2 border-t border-slate-100">
                                <div class="px-1 pb-1.5 flex items-center justify-between">
                                    <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bạn bè (${friends.length})</span>
                                    <a href="/friends" class="text-[11px] text-emerald-600 font-semibold hover:underline">Quản lý</a>
                                </div>
                                <div class="space-y-1">
                                    ${friends.map(f => `
                                        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/50 transition-colors">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <img src="${f.avatar_url}" class="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500 flex-shrink-0">
                                                <div class="min-w-0">
                                                    <span class="text-xs font-bold text-slate-700 block truncate">${f.full_name}</span>
                                                    <span class="text-[10px] text-slate-400 block truncate">${f.email}</span>
                                                </div>
                                            </div>
                                            <form method="POST" action="/chat/start" class="m-0 flex-shrink-0">
                                                <input type="hidden" name="user_id" value="${f.id}">
                                                <button type="submit" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer" title="Nhắn tin với ${f.full_name}">
                                                    💬 Chat
                                                </button>
                                            </form>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                    </div>
                </div>

                <!-- 3. KHUNG CHAT CHÍNH -->
                <div class="flex-1 flex flex-col bg-[#f0fdf4] overflow-hidden">
                    
                    ${activeConv ? `
                        <!-- Chat Header khi có conversation -->
                        <div class="h-14 bg-white border-b border-emerald-100 px-5 flex items-center justify-between flex-shrink-0 shadow-xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <div id="chat-header-avatar" class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                                    ${isGroup ? '👥' : (activeConv.direct_user_avatar ? '<img src="' + activeConv.direct_user_avatar + '" class="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-600">' : '👤')}
                                </div>
                                <div class="min-w-0">
                                    <h3 id="chat-header-title" class="font-bold text-sm text-slate-800 truncate">${activeTitle}</h3>
                                    <p id="chat-header-status" class="text-[11px] text-emerald-600 font-medium">${activeStatus}</p>
                                </div>
                            </div>
                            <span class="text-xs text-slate-400 font-mono">host: ${os.hostname().slice(0, 8)}</span>
                        </div>

                        <!-- Messages Stream (SSR render sẵn các tin nhắn đã có) -->
                        <div id="messages-stream" class="flex-1 overflow-y-auto p-4 space-y-2">
                            ${initialMessages && initialMessages.length > 0 ? initialMessages.map(m => {
                                const isMe = m.sender_id === req.user.id;
                                const time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                const imageTag = m.image_url ? '<a href="' + m.image_url + '" target="_blank"><img src="' + m.image_url + '" class="rounded-xl mt-1.5 max-h-60 object-cover cursor-pointer"></a>' : '';

                                if (isMe) {
                                    return `
                                        <div class="flex justify-end gap-2 my-1.5 group">
                                            <button onclick="deleteMsg(${m.id})" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs self-center transition-opacity cursor-pointer" title="Xóa tin nhắn">🗑️</button>
                                            <div class="max-w-[70%] text-right">
                                                <div class="bg-emerald-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-none shadow-xs text-left inline-block">
                                                    ${m.content ? '<span>' + m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>' : ''}
                                                    ${imageTag}
                                                </div>
                                                <span class="text-[10px] text-emerald-800/60 block mt-0.5">${time}</span>
                                            </div>
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div class="flex items-start gap-2.5 my-1.5">
                                            <img src="${m.sender_avatar}" class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-emerald-200">
                                            <div class="max-w-[70%]">
                                                <span class="text-[11px] font-semibold text-slate-700 block mb-0.5">${m.sender_name}</span>
                                                <div class="bg-white border border-emerald-100 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none shadow-xs inline-block">
                                                    ${m.content ? '<span>' + m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>' : ''}
                                                    ${imageTag}
                                                </div>
                                                <span class="text-[10px] text-slate-400 block mt-0.5">${time}</span>
                                            </div>
                                        </div>
                                    `;
                                }
                            }).join('') : `
                                <div class="text-center py-20 text-slate-400 text-xs space-y-1">
                                    <div class="text-3xl">🌿</div>
                                    <p class="font-semibold text-slate-600">Chưa có tin nhắn nào trong hội thoại này.</p>
                                    <p class="text-slate-400">Hãy nhập tin nhắn bên dưới để bắt đầu trò chuyện ngay!</p>
                                </div>
                            `}
                        </div>

                        <!-- Chat Input Area (LUÔN HIỂN THỊ SẴN SÀNG ĐỂ GỬI) -->
                        <div id="chat-input-area" class="p-3 bg-white border-t border-emerald-100 flex-shrink-0">
                            <div class="flex gap-2.5 mb-2 text-sm text-slate-500 items-center">
                                <button type="button" onclick="sendQuickEmoji('👍')" class="hover:scale-125 transition-transform cursor-pointer">👍</button>
                                <button type="button" onclick="sendQuickEmoji('❤️')" class="hover:scale-125 transition-transform cursor-pointer">❤️</button>
                                <button type="button" onclick="sendQuickEmoji('🌿')" class="hover:scale-125 transition-transform cursor-pointer">🌿</button>
                                <button type="button" onclick="sendQuickEmoji('🔥')" class="hover:scale-125 transition-transform cursor-pointer">🔥</button>
                                <button type="button" onclick="sendQuickEmoji('😂')" class="hover:scale-125 transition-transform cursor-pointer">😂</button>
                                <button type="button" onclick="sendQuickEmoji('🎉')" class="hover:scale-125 transition-transform cursor-pointer">🎉</button>
                                <button type="button" onclick="toggleMediaInput()" class="hover:text-emerald-600 text-xs flex items-center gap-1 font-semibold ml-auto cursor-pointer">
                                    📷 Gửi link ảnh
                                </button>
                            </div>

                            <div id="media-input-box" class="mb-2 hidden">
                                <input type="url" name="image_url" id="msg-image-url" form="chat-form" placeholder="Dán link ảnh (https://...)" 
                                    class="w-full text-xs px-3 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            </div>

                            <!-- Form gửi tin nhắn: hỗ trợ cả AJAX và POST trực tiếp -->
                            <form id="chat-form" method="POST" action="/chat/send" onsubmit="sendMessage(event)" class="flex items-center gap-2">
                                <input type="hidden" name="conversation_id" id="form-conv-id" value="${activeConvId}">
                                <input type="text" name="content" id="msg-input" placeholder="Nhập tin nhắn..." required autocomplete="off" autofocus
                                    class="flex-1 bg-emerald-50/50 text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white border border-emerald-200 transition-all text-slate-800 font-medium">
                                <button type="submit" 
                                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer">
                                    <span>Gửi</span> <span>➤</span>
                                </button>
                            </form>
                        </div>
                    ` : `
                        <!-- Zero State khi chưa có conversation nào -->
                        <div class="h-14 bg-white border-b border-emerald-100 px-5 flex items-center justify-between flex-shrink-0 shadow-xs">
                            <h3 class="font-bold text-sm text-slate-800">GreenChat</h3>
                            <span class="text-xs text-slate-400 font-mono">host: ${os.hostname().slice(0, 8)}</span>
                        </div>

                        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div class="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold shadow-sm">
                                🌿
                            </div>
                            <div class="max-w-md space-y-2">
                                <h3 class="text-xl font-bold text-slate-800">Chào mừng, ${req.user.full_name}!</h3>
                                <p class="text-xs text-slate-500 leading-relaxed">
                                    Bạn chưa có cuộc trò chuyện nào. Hãy kết bạn bằng Gmail để bắt đầu nhắn tin hoặc tạo một nhóm trò chuyện mới!
                                </p>
                            </div>
                            <div class="flex gap-3 pt-2">
                                <a href="/friends" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                                    👥 Tìm bạn qua Gmail
                                </a>
                                <button onclick="document.getElementById('group-modal').classList.remove('hidden')" class="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer">
                                    + Tạo nhóm mới
                                </button>
                            </div>
                        </div>
                    `}

                </div>

                <!-- MODAL TẠO NHÓM CHAT MỚI -->
                <div id="group-modal" class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] hidden">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-emerald-100">
                        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 class="font-bold text-base text-slate-800">Tạo nhóm chat mới</h3>
                            <button type="button" onclick="document.getElementById('group-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer">&times;</button>
                        </div>

                        <form method="POST" action="/groups/create" class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">Tên nhóm</label>
                                <input type="text" name="title" placeholder="Ví dụ: Nhóm Đồ Án DevOps..." required
                                    class="w-full text-xs px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900">
                            </div>

                            ${friends && friends.length > 0 ? `
                                <div>
                                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Chọn bạn bè tham gia nhóm:</label>
                                    <div class="max-h-36 overflow-y-auto space-y-1 border border-emerald-100 rounded-xl p-2 bg-emerald-50/20">
                                        ${friends.map(f => `
                                            <label class="flex items-center gap-2.5 p-1.5 hover:bg-emerald-100/50 rounded-lg cursor-pointer text-xs">
                                                <input type="checkbox" name="members" value="${f.id}" class="rounded text-emerald-600 focus:ring-emerald-500">
                                                <img src="${f.avatar_url}" class="w-6 h-6 rounded-full object-cover">
                                                <span class="font-medium text-slate-800 truncate">${f.full_name}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer">
                                Tạo nhóm ngay
                            </button>
                        </form>
                    </div>
                </div>

                <!-- JAVASCRIPT REAL-TIME CHAT -->
                <script>
                    var currentUserId = ${req.user.id};
                    var activeConvId = ${activeConvId};
                    var pollTimer = null;

                    function escapeHtml(str) {
                        if (!str) return '';
                        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                    }

                    function selectConversation(convId, title, type, avatar) {
                        activeConvId = convId;
                        var formConvId = document.getElementById('form-conv-id');
                        if (formConvId) formConvId.value = convId;

                        var cards = document.querySelectorAll('.conv-card');
                        for (var i = 0; i < cards.length; i++) {
                            cards[i].classList.remove('bg-emerald-50/90', 'border-emerald-600', 'shadow-xs');
                            cards[i].classList.add('border-transparent');
                        }
                        var activeEl = document.getElementById('conv-item-' + convId);
                        if (activeEl) {
                            activeEl.classList.add('bg-emerald-50/90', 'border-emerald-600', 'shadow-xs');
                            activeEl.classList.remove('border-transparent');
                        }

                        var titleEl = document.getElementById('chat-header-title');
                        if (titleEl) titleEl.innerText = title;

                        var statusEl = document.getElementById('chat-header-status');
                        if (statusEl) statusEl.innerText = type === 'group' ? 'Nhóm trò chuyện' : 'Trực tuyến';

                        var avatarEl = document.getElementById('chat-header-avatar');
                        if (avatarEl) {
                            if (avatar && avatar.length > 5) {
                                avatarEl.innerHTML = '<img src="' + avatar + '" class="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-600">';
                            } else {
                                avatarEl.innerText = type === 'group' ? '👥' : '👤';
                            }
                        }

                        var msgInput = document.getElementById('msg-input');
                        if (msgInput) {
                            msgInput.placeholder = 'Nhập tin nhắn với ' + title + '...';
                            msgInput.focus();
                        }

                        loadMessages();
                        if (pollTimer) clearInterval(pollTimer);
                        pollTimer = setInterval(loadMessages, 2000);
                    }

                    function loadMessages() {
                        if (!activeConvId) return;
                        fetch('/api/messages?conversation_id=' + activeConvId)
                            .then(function(res) { return res.json(); })
                            .then(function(messages) {
                                var container = document.getElementById('messages-stream');
                                if (!container) return;

                                if (!messages || messages.length === 0) {
                                    container.innerHTML = '<div class="text-center py-20 text-slate-400 text-xs space-y-1"><div class="text-3xl">🌿</div><p class="font-semibold text-slate-600">Chưa có tin nhắn nào trong hội thoại này.</p><p class="text-slate-400">Hãy gửi lời chào đầu tiên!</p></div>';
                                    return;
                                }

                                var isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
                                var html = '';

                                for (var i = 0; i < messages.length; i++) {
                                    var m = messages[i];
                                    var isMe = m.sender_id === currentUserId;
                                    var time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                    var imageTag = m.image_url ? '<a href="' + m.image_url + '" target="_blank"><img src="' + m.image_url + '" class="rounded-xl mt-1.5 max-h-60 object-cover cursor-pointer"></a>' : '';

                                    if (isMe) {
                                        html += '<div class="flex justify-end gap-2 my-1.5 group">' +
                                            '<button onclick="deleteMsg(' + m.id + ')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs self-center transition-opacity cursor-pointer" title="Xóa tin nhắn">🗑️</button>' +
                                            '<div class="max-w-[70%] text-right">' +
                                                '<div class="bg-emerald-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-none shadow-xs text-left inline-block">' +
                                                    (m.content ? '<span>' + escapeHtml(m.content) + '</span>' : '') +
                                                    imageTag +
                                                '</div>' +
                                                '<span class="text-[10px] text-emerald-800/60 block mt-0.5">' + time + '</span>' +
                                            '</div>' +
                                        '</div>';
                                    } else {
                                        html += '<div class="flex items-start gap-2.5 my-1.5">' +
                                            '<img src="' + m.sender_avatar + '" class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-emerald-200">' +
                                            '<div class="max-w-[70%]">' +
                                                '<span class="text-[11px] font-semibold text-slate-700 block mb-0.5">' + escapeHtml(m.sender_name) + '</span>' +
                                                '<div class="bg-white border border-emerald-100 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none shadow-xs inline-block">' +
                                                    (m.content ? '<span>' + escapeHtml(m.content) + '</span>' : '') +
                                                    imageTag +
                                                '</div>' +
                                                '<span class="text-[10px] text-slate-400 block mt-0.5">' + time + '</span>' +
                                            '</div>' +
                                        '</div>';
                                    }
                                }

                                container.innerHTML = html;
                                if (isAtBottom) {
                                    container.scrollTop = container.scrollHeight;
                                }
                            })
                            .catch(function(err) {
                                console.error('Polling error:', err);
                            });
                    }

                    function sendMessage(e) {
                        if (e) e.preventDefault();
                        var input = document.getElementById('msg-input');
                        var imgInput = document.getElementById('msg-image-url');
                        var content = input ? input.value.trim() : '';
                        var image_url = imgInput ? imgInput.value.trim() : '';

                        if (!content && !image_url) return;

                        if (!activeConvId) {
                            alert('Vui lòng chọn hoặc bắt đầu một cuộc trò chuyện để gửi tin nhắn!');
                            return;
                        }

                        var originalText = input.value;
                        input.value = '';
                        if (imgInput) imgInput.value = '';
                        var mediaBox = document.getElementById('media-input-box');
                        if (mediaBox) mediaBox.classList.add('hidden');

                        fetch('/api/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                conversation_id: activeConvId,
                                content: content,
                                image_url: image_url
                            })
                        })
                        .then(function(res) {
                            if (!res.ok) throw new Error('Send failed');
                            return res.json();
                        })
                        .then(function() {
                            loadMessages();
                            if (input) input.focus();
                        })
                        .catch(function(err) {
                            console.error('Fetch send failed, fallback to form submit:', err);
                            if (input) input.value = originalText;
                            var form = document.getElementById('chat-form');
                            if (form) form.submit();
                        });
                    }

                    function deleteMsg(id) {
                        if (!confirm('Bạn có muốn xóa tin nhắn này?')) return;
                        fetch('/api/messages/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message_id: id })
                        }).then(function() {
                            loadMessages();
                        });
                    }

                    function sendQuickEmoji(emoji) {
                        var input = document.getElementById('msg-input');
                        if (!input) return;
                        input.value = input.value ? input.value + ' ' + emoji : emoji;
                        input.focus();
                    }

                    function toggleMediaInput() {
                        var box = document.getElementById('media-input-box');
                        if (box) box.classList.toggle('hidden');
                    }

                    window.onload = function() {
                        var container = document.getElementById('messages-stream');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                        if (activeConvId) {
                            if (pollTimer) clearInterval(pollTimer);
                            pollTimer = setInterval(loadMessages, 2000);
                        }
                    };
                </script>
            </body>
            </html>
        `);
    }
});

// APIs cho Real-time Polling
app.get('/api/messages', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const convId = parseInt(req.query.conversation_id);
    if (!convId) return res.json([]);

    const sql = `
        SELECT m.id, m.content, m.image_url, m.created_at, m.sender_id,
               u.full_name AS sender_name, u.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.id ASC
    `;
    db.query(sql, [convId], (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(messages || []);
    });
});

app.post('/api/messages', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { conversation_id, content, image_url } = req.body;
    if (!conversation_id || (!content && !image_url)) return res.status(400).json({ error: 'Nội dung trống' });

    db.query(
        'INSERT INTO messages (conversation_id, sender_id, content, image_url) VALUES (?, ?, ?, ?)',
        [conversation_id, req.user.id, content || '', image_url || ''],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message_id: result.insertId });
        }
    );
});

app.post('/api/messages/delete', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const msgId = parseInt(req.body.message_id);
    db.query('DELETE FROM messages WHERE id = ? AND sender_id = ?', [msgId, req.user.id], () => {
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GreenChat running on port ${PORT}`));
