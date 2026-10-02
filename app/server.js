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

const APP_VERSION = "v1.0.0"; // Phục vụ demo nâng cấp CI/CD

// Helper phân tích cookie
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

// Middleware xác thực người dùng
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
                    <p class="text-xs text-emerald-700 font-medium">Nền tảng nhắn tin & kết bạn qua Gmail</p>
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
                    Ứng dụng vận hành hoàn toàn trên Docker Ubuntu • MySQL
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

// ==================== TÌM KIẾM & KẾT BẠN QUA GMAIL ====================

// API Tìm kiếm người dùng qua Gmail
app.get('/api/search', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const query = (req.query.q || '').trim();
    if (!query) return res.json([]);

    const sql = `
        SELECT u.id, u.email, u.full_name, u.avatar_url,
               IF(f.id IS NOT NULL, 1, 0) AS is_friend
        FROM users u
        LEFT JOIN friendships f ON (f.user_id = ? AND f.friend_id = u.id)
        WHERE (u.email LIKE ? OR u.full_name LIKE ?) AND u.id != ?
        LIMIT 10
    `;
    db.query(sql, [req.user.id, `%${query}%`, `%${query}%`, req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results || []);
    });
});

// API Lấy danh sách bạn bè
app.get('/api/friends', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const sql = `
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ?
        ORDER BY u.full_name ASC
    `;
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results || []);
    });
});

// API Thêm bạn bè
app.post('/api/friends/add', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const friendId = parseInt(req.body.friend_id);
    if (!friendId || friendId === req.user.id) return res.status(400).json({ error: 'Invalid user' });

    const sql = `INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)`;
    db.query(sql, [req.user.id, friendId, friendId, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API Hủy kết bạn
app.post('/api/friends/remove', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const friendId = parseInt(req.body.friend_id);
    const sql = `DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`;
    db.query(sql, [req.user.id, friendId, friendId, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Bắt đầu cuộc trò chuyện 1-1 với một người bạn
app.post('/api/conversations/direct', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const targetUserId = parseInt(req.body.user_id);
    if (!targetUserId || targetUserId === req.user.id) return res.status(400).json({ error: 'Invalid user' });

    const checkSql = `
        SELECT c.id 
        FROM conversations c
        JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
        JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
        WHERE c.type = 'direct'
        LIMIT 1
    `;
    db.query(checkSql, [req.user.id, targetUserId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.json({ conversation_id: results[0].id });
        }

        db.query('INSERT INTO conversations (type, created_by) VALUES ("direct", ?)', [req.user.id], (err, convRes) => {
            if (err) return res.status(500).json({ error: err.message });
            const convId = convRes.insertId;

            db.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)',
                [convId, req.user.id, convId, targetUserId],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ conversation_id: convId });
                }
            );
        });
    });
});

// Tạo nhóm chat mới
app.post('/api/conversations/group', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Thiếu tên nhóm' });

    db.query('INSERT INTO conversations (type, title, created_by) VALUES ("group", ?, ?)', [title.trim(), req.user.id], (err, convRes) => {
        if (err) return res.status(500).json({ error: err.message });
        const convId = convRes.insertId;

        db.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [convId, req.user.id], (err) => {
            res.redirect(`/?conv=${convId}`);
        });
    });
});

// Lấy danh sách tin nhắn của 1 cuộc trò chuyện
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

// Gửi tin nhắn mới
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

// Xóa tin nhắn
app.post('/api/messages/delete', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const msgId = parseInt(req.body.message_id);
    db.query('DELETE FROM messages WHERE id = ? AND sender_id = ?', [msgId, req.user.id], (err) => {
        res.json({ success: true });
    });
});

// ==================== MAIN VIEW (TÁCH BIỆT CHAT VÀ KẾT BẠN) ====================

app.get('/', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const selectedConvId = parseInt(req.query.conv) || 0;

    // 1. Lấy danh sách các cuộc trò chuyện
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

    db.query(convSql, [req.user.id, req.user.id], (err, conversations) => {
        // 2. Lấy danh sách bạn bè
        const friendsSql = `
            SELECT u.id, u.email, u.full_name, u.avatar_url, u.status
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ?
            ORDER BY u.full_name ASC
        `;
        db.query(friendsSql, [req.user.id], (err, friends) => {

            res.send(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>GreenChat - Tin nhắn & Bạn bè</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f0fdf4; }
                    </style>
                </head>
                <body class="h-screen flex overflow-hidden">

                    <!-- 1. CỘT ĐIỀU HƯỚNG BÊN TRÁI (LEFT RAIL BAR) -->
                    <nav class="w-16 bg-emerald-700 flex flex-col items-center py-4 justify-between flex-shrink-0 z-30 shadow-md">
                        <div class="flex flex-col items-center gap-5 w-full">
                            <!-- Logo GreenChat -->
                            <div class="w-11 h-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer" title="GreenChat">
                                🌿
                            </div>

                            <!-- Nút chuyển sang PHẦN CHAT -->
                            <button onclick="setMainMode('chat')" id="nav-chat-btn" 
                                class="w-11 h-11 rounded-xl bg-white/20 text-white flex flex-col items-center justify-center text-sm transition-all" title="Tin nhắn">
                                <span class="text-lg">💬</span>
                                <span class="text-[9px] font-semibold">Chat</span>
                            </button>

                            <!-- Nút chuyển sang PHẦN KẾT BẠN -->
                            <button onclick="setMainMode('friends')" id="nav-friends-btn" 
                                class="w-11 h-11 rounded-xl hover:bg-white/10 text-white/80 flex flex-col items-center justify-center text-sm transition-all" title="Bạn bè & Thêm bạn">
                                <span class="text-lg">👥</span>
                                <span class="text-[9px] font-semibold">Bạn bè</span>
                            </button>
                        </div>

                        <div class="flex flex-col items-center gap-4">
                            <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">${APP_VERSION}</span>
                            <a href="/logout" title="Đăng xuất" class="text-white/80 hover:text-white p-2 text-lg">
                                🚪
                            </a>
                        </div>
                    </nav>

                    <!-- ==================== VIEW 1: PHẦN CHAT (CHUYÊN ĐỂ NHẮN TIN) ==================== -->
                    <div id="view-chat" class="flex-1 flex overflow-hidden">
                        
                        <!-- Cột danh sách cuộc trò chuyện -->
                        <div class="w-80 bg-white border-r border-emerald-100 flex flex-col flex-shrink-0">
                            <div class="p-3.5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/30">
                                <div class="flex items-center gap-2.5">
                                    <img src="${req.user.avatar_url}" class="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-600">
                                    <div class="min-w-0">
                                        <h3 class="font-bold text-xs text-slate-800 truncate">${req.user.full_name}</h3>
                                        <span class="text-[10px] text-emerald-600 font-medium">${req.user.email}</span>
                                    </div>
                                </div>
                                <button onclick="setMainMode('friends')" class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-emerald-200" title="Tìm bạn mới">
                                    + Bạn
                                </button>
                            </div>

                            <div class="p-3 border-b border-slate-100 flex items-center justify-between">
                                <span class="text-xs font-bold text-slate-700">Cuộc trò chuyện</span>
                                <button onclick="openCreateGroupModal()" class="text-xs text-emerald-700 font-bold hover:underline">+ Tạo nhóm</button>
                            </div>

                            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                                ${conversations && conversations.length > 0 ? conversations.map(c => {
                                    const isGroup = c.type === 'group';
                                    const name = isGroup ? c.title : (c.direct_user_name || 'Người dùng');
                                    const avatar = isGroup ? '👥' : (c.direct_user_avatar ? `<img src="${c.direct_user_avatar}" class="w-10 h-10 rounded-full object-cover">` : '👤');
                                    const subText = c.last_message || (isGroup ? 'Nhóm mới tạo' : c.direct_user_email);

                                    return `
                                        <div onclick="selectConversation(${c.id}, '${name.replace(/'/g, "\\'")}', '${isGroup ? 'group' : 'direct'}')"
                                             id="conv-item-${c.id}"
                                             class="conv-card flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-emerald-50/50 transition-colors border-l-4 border-transparent">
                                            <div class="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0 text-lg">
                                                ${avatar}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex justify-between items-baseline">
                                                    <h4 class="text-xs font-bold text-slate-800 truncate">${name}</h4>
                                                </div>
                                                <p class="text-[11px] text-slate-400 truncate mt-0.5">${subText}</p>
                                            </div>
                                        </div>
                                    `;
                                }).join('') : `
                                    <div class="text-center py-16 px-4 text-slate-400 text-xs space-y-3">
                                        <p>Chưa có cuộc trò chuyện nào.</p>
                                        <button onclick="setMainMode('friends')" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-700">
                                            👥 Sang phần Bạn bè để kết bạn
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Khung chat chính -->
                        <div class="flex-1 flex flex-col bg-[#f0fdf4] overflow-hidden">
                            <div class="h-14 bg-white border-b border-emerald-100 px-5 flex items-center justify-between flex-shrink-0 shadow-xs">
                                <div class="flex items-center gap-3">
                                    <div id="chat-header-avatar" class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                                        🌿
                                    </div>
                                    <div>
                                        <h3 id="chat-header-title" class="font-bold text-sm text-slate-800">Chọn cuộc trò chuyện</h3>
                                        <p id="chat-header-status" class="text-[11px] text-emerald-600 font-medium">Sẵn sàng</p>
                                    </div>
                                </div>
                                <span class="text-xs text-slate-400 font-mono">host: ${os.hostname().slice(0, 8)}</span>
                            </div>

                            <div id="messages-stream" class="flex-1 overflow-y-auto p-4 space-y-2">
                                <div class="text-center py-24 text-slate-400 text-xs">
                                    Hãy chọn một người bạn ở danh sách bên trái hoặc sang mục <b>Bạn bè</b> để tìm kiếm kết bạn.
                                </div>
                            </div>

                            <div id="chat-input-area" class="p-3 bg-white border-t border-emerald-100 flex-shrink-0 hidden">
                                <div class="flex gap-3 mb-2 text-sm text-slate-400">
                                    <button onclick="sendQuickEmoji('👍')" class="hover:scale-125 transition-transform">👍</button>
                                    <button onclick="sendQuickEmoji('❤️')" class="hover:scale-125 transition-transform">❤️</button>
                                    <button onclick="sendQuickEmoji('🌿')" class="hover:scale-125 transition-transform">🌿</button>
                                    <button onclick="sendQuickEmoji('🔥')" class="hover:scale-125 transition-transform">🔥</button>
                                    <button onclick="toggleMediaInput()" class="hover:text-emerald-600 text-xs flex items-center gap-1 font-semibold ml-auto">
                                        📷 Gửi ảnh
                                    </button>
                                </div>

                                <div id="media-input-box" class="mb-2 hidden">
                                    <input type="url" id="msg-image-url" placeholder="Dán link ảnh (https://...)" 
                                        class="w-full text-xs px-3 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                </div>

                                <form onsubmit="sendMessage(event)" class="flex items-center gap-2">
                                    <input type="text" id="msg-input" placeholder="Nhập tin nhắn..." required autocomplete="off"
                                        class="flex-1 bg-emerald-50/50 text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white border border-emerald-100 transition-all">
                                    <button type="submit" 
                                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm">
                                        Gửi
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>

                    <!-- ==================== VIEW 2: PHẦN KẾT BẠN & DANH BẠ (TÁCH BIỆT HOÀN TOÀN) ==================== -->
                    <div id="view-friends" class="flex-1 flex overflow-hidden hidden bg-[#f0fdf4]">
                        
                        <div class="max-w-4xl w-full mx-auto p-6 flex flex-col gap-6 overflow-y-auto">
                            
                            <!-- Tiêu đề trang kết bạn -->
                            <div class="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
                                <div>
                                    <h2 class="text-xl font-bold text-slate-800">👥 Quản lý Bạn bè & Thêm bạn qua Gmail</h2>
                                    <p class="text-xs text-slate-500 mt-1">Tìm kiếm bằng địa chỉ Gmail của thành viên để kết bạn và bắt đầu trò chuyện</p>
                                </div>
                                <button onclick="setMainMode('chat')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm">
                                    💬 Quay lại Chat
                                </button>
                            </div>

                            <!-- KHUNG TÌM KIẾM BẠN BÈ QUA GMAIL TO RÕ RÀNG -->
                            <div class="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider text-emerald-800">
                                    🔍 Tìm kiếm người dùng bằng Gmail
                                </h3>

                                <div class="flex gap-2">
                                    <input type="text" id="dedicated-search-input" 
                                        placeholder="Nhập địa chỉ Gmail cần tìm (ví dụ: nhan@gmail.com hoặc dang.2006.qt@gmail.com)..." 
                                        class="flex-1 text-sm px-4 py-3 bg-emerald-50/40 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 transition-all"
                                        onkeypress="if(event.key === 'Enter') doDedicatedSearch()">
                                    <button onclick="doDedicatedSearch()" 
                                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                                        <span>Tìm kiếm</span>
                                    </button>
                                </div>

                                <!-- Khu vực hiển thị kết quả tìm kiếm -->
                                <div id="dedicated-search-results" class="pt-2">
                                    <p class="text-xs text-slate-400 italic">Nhập Gmail vào ô trên và bấm Tìm kiếm để xem kết quả.</p>
                                </div>
                            </div>

                            <!-- DANH SÁCH BẠN BÈ HIỆN TẠI -->
                            <div class="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider text-emerald-800">
                                        Danh sách bạn bè đã kết bạn (<span id="friends-count-badge">${friends ? friends.length : 0}</span>)
                                    </h3>
                                    <button onclick="reloadFriendsList()" class="text-xs text-emerald-600 font-semibold hover:underline">
                                        🔄 Làm mới danh sách
                                    </button>
                                </div>

                                <div id="friends-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                                <button onclick="startDirectChat(${f.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors">
                                                    Nhắn tin
                                                </button>
                                                <button onclick="removeFriend(${f.id})" class="text-rose-500 hover:bg-rose-50 text-xs px-2 py-1.5 rounded-lg font-semibold" title="Hủy kết bạn">
                                                    ✕
                                                </button>
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

                    <!-- MODAL TẠO NHÓM CHAT MỚI -->
                    <div id="group-modal" class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] hidden" onclick="if(event.target === this) closeCreateGroupModal()">
                        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-emerald-100" onclick="event.stopPropagation()">
                            <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 class="font-bold text-base text-slate-800">Tạo nhóm chat mới</h3>
                                <button type="button" onclick="closeCreateGroupModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
                            </div>

                            <form method="POST" action="/api/conversations/group" class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-600 mb-1">Tên nhóm</label>
                                    <input type="text" name="title" placeholder="Ví dụ: Nhóm Đồ Án DevOps..." required
                                        class="w-full text-xs px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900">
                                </div>
                                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm">
                                    Tạo nhóm ngay
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- SCRIPT ĐIỀU KHIỂN HOÀN TOÀN -->
                    <script>
                        var currentUserId = ${req.user.id};
                        var activeConvId = ${selectedConvId || 0};
                        var pollTimer = null;

                        // 1. CHUYỂN ĐỔI CHẾ ĐỘ: 'chat' HOẶC 'friends'
                        function setMainMode(mode) {
                            var viewChat = document.getElementById('view-chat');
                            var viewFriends = document.getElementById('view-friends');
                            var navChatBtn = document.getElementById('nav-chat-btn');
                            var navFriendsBtn = document.getElementById('nav-friends-btn');

                            if (mode === 'chat') {
                                viewChat.classList.remove('hidden');
                                viewFriends.classList.add('hidden');
                                navChatBtn.className = 'w-11 h-11 rounded-xl bg-white/20 text-white flex flex-col items-center justify-center text-sm transition-all';
                                navFriendsBtn.className = 'w-11 h-11 rounded-xl hover:bg-white/10 text-white/80 flex flex-col items-center justify-center text-sm transition-all';
                            } else {
                                viewChat.classList.add('hidden');
                                viewFriends.classList.remove('hidden');
                                navFriendsBtn.className = 'w-11 h-11 rounded-xl bg-white/20 text-white flex flex-col items-center justify-center text-sm transition-all';
                                navChatBtn.className = 'w-11 h-11 rounded-xl hover:bg-white/10 text-white/80 flex flex-col items-center justify-center text-sm transition-all';
                                setTimeout(function() {
                                    var inp = document.getElementById('dedicated-search-input');
                                    if (inp) inp.focus();
                                }, 50);
                            }
                        }

                        // 2. TÌM KIẾM BẠN BÈ TRONG PHẦN BẠN BÈ
                        function doDedicatedSearch() {
                            var input = document.getElementById('dedicated-search-input');
                            var query = input.value.trim();
                            var resultsContainer = document.getElementById('dedicated-search-results');

                            if (!query) {
                                resultsContainer.innerHTML = '<p class="text-xs text-rose-500 font-semibold">Vui lòng nhập địa chỉ Gmail cần tìm!</p>';
                                return;
                            }

                            resultsContainer.innerHTML = '<p class="text-xs text-slate-500">Đang tìm kiếm...</p>';

                            fetch('/api/search?q=' + encodeURIComponent(query))
                                .then(function(res) { return res.json(); })
                                .then(function(users) {
                                    if (!users || users.length === 0) {
                                        resultsContainer.innerHTML = '<div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">Không tìm thấy tài khoản nào khớp với Gmail: <b>' + query + '</b></div>';
                                        return;
                                    }

                                    var html = '<div class="space-y-3">';
                                    for (var i = 0; i < users.length; i++) {
                                        var u = users[i];
                                        var friendAction = !u.is_friend
                                            ? '<button onclick="addFriendDedicated(' + u.id + ', this)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs">➕ Kết bạn</button>'
                                            : '<span class="text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1.5 rounded-xl">✓ Đã là bạn bè</span>';

                                        html += '<div class="flex items-center justify-between p-4 bg-emerald-50/40 rounded-xl border border-emerald-200">' +
                                            '<div class="flex items-center gap-3.5">' +
                                                '<img src="' + u.avatar_url + '" class="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-600">' +
                                                '<div>' +
                                                    '<span class="font-bold text-sm text-slate-800 block">' + u.full_name + '</span>' +
                                                    '<span class="text-xs text-slate-500 block">' + u.email + '</span>' +
                                                '</div>' +
                                            '</div>' +
                                            '<div class="flex items-center gap-2">' +
                                                friendAction +
                                                '<button onclick="startDirectChat(' + u.id + ')" class="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors">💬 Nhắn tin</button>' +
                                            '</div>' +
                                        '</div>';
                                    }
                                    html += '</div>';
                                    resultsContainer.innerHTML = html;
                                });
                        }

                        // 3. KẾT BẠN
                        function addFriendDedicated(friendId, btn) {
                            btn.disabled = true;
                            btn.innerText = 'Đang kết bạn...';
                            fetch('/api/friends/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ friend_id: friendId })
                            }).then(function(res) {
                                if (res.ok) {
                                    btn.className = 'text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1.5 rounded-xl';
                                    btn.innerText = '✓ Đã kết bạn thành công';
                                    reloadFriendsList();
                                }
                            });
                        }

                        // 4. HỦY KẾT BẠN
                        function removeFriend(friendId) {
                            if (!confirm('Bạn có chắc muốn hủy kết bạn?')) return;
                            fetch('/api/friends/remove', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ friend_id: friendId })
                            }).then(function() {
                                reloadFriendsList();
                            });
                        }

                        // 5. TẢI LẠI DANH SÁCH BẠN BÈ
                        function reloadFriendsList() {
                            fetch('/api/friends')
                                .then(function(res) { return res.json(); })
                                .then(function(friends) {
                                    document.getElementById('friends-count-badge').innerText = friends.length;
                                    var container = document.getElementById('friends-list-container');
                                    if (friends.length === 0) {
                                        container.innerHTML = '<div class="col-span-2 text-center py-8 text-slate-400 text-xs">Bạn chưa có bạn bè nào. Hãy tìm kiếm ở trên để kết bạn!</div>';
                                        return;
                                    }

                                    var html = '';
                                    for (var i = 0; i < friends.length; i++) {
                                        var f = friends[i];
                                        html += '<div class="flex items-center justify-between p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100">' +
                                            '<div class="flex items-center gap-3 min-w-0">' +
                                                '<img src="' + f.avatar_url + '" class="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-600">' +
                                                '<div class="min-w-0">' +
                                                    '<span class="font-bold text-xs text-slate-800 block truncate">' + f.full_name + '</span>' +
                                                    '<span class="text-[11px] text-slate-500 block truncate">' + f.email + '</span>' +
                                                '</div>' +
                                            '</div>' +
                                            '<div class="flex items-center gap-2">' +
                                                '<button onclick="startDirectChat(' + f.id + ')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors">Nhắn tin</button>' +
                                                '<button onclick="removeFriend(' + f.id + ')" class="text-rose-500 hover:bg-rose-50 text-xs px-2 py-1.5 rounded-lg font-semibold" title="Hủy kết bạn">✕</button>' +
                                            '</div>' +
                                        '</div>';
                                    }
                                    container.innerHTML = html;
                                });
                        }

                        // 6. BẮT ĐẦU NHẮN TIN VÀ CHUYỂN NGAY VỀ VIEW CHAT
                        function startDirectChat(userId) {
                            fetch('/api/conversations/direct', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: userId })
                            })
                            .then(function(res) { return res.json(); })
                            .then(function(data) {
                                if (data.conversation_id) {
                                    window.location.href = '/?conv=' + data.conversation_id;
                                }
                            });
                        }

                        // 7. CHỌN CUỘC TRÒ CHUYỆN
                        function selectConversation(convId, title, type) {
                            activeConvId = convId;
                            var cards = document.querySelectorAll('.conv-card');
                            for (var i = 0; i < cards.length; i++) {
                                cards[i].classList.remove('bg-emerald-50/80', 'border-emerald-600');
                                cards[i].classList.add('border-transparent');
                            }
                            var activeEl = document.getElementById('conv-item-' + convId);
                            if (activeEl) {
                                activeEl.classList.add('bg-emerald-50/80', 'border-emerald-600');
                                activeEl.classList.remove('border-transparent');
                            }

                            document.getElementById('chat-header-title').innerText = title;
                            document.getElementById('chat-header-status').innerText = type === 'group' ? 'Nhóm trò chuyện' : 'Trực tuyến';
                            document.getElementById('chat-header-avatar').innerText = type === 'group' ? '👥' : '👤';
                            document.getElementById('chat-input-area').classList.remove('hidden');

                            loadMessages();
                            if (pollTimer) clearInterval(pollTimer);
                            pollTimer = setInterval(loadMessages, 2000);
                        }

                        // 8. TẢI TIN NHẮN (REAL-TIME POLLING)
                        function loadMessages() {
                            if (!activeConvId) return;
                            fetch('/api/messages?conversation_id=' + activeConvId)
                                .then(function(res) { return res.json(); })
                                .then(function(messages) {
                                    var container = document.getElementById('messages-stream');
                                    if (!messages || messages.length === 0) {
                                        container.innerHTML = '<div class="text-center py-16 text-slate-400 text-xs">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!</div>';
                                        return;
                                    }

                                    var isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
                                    var html = '';

                                    for (var i = 0; i < messages.length; i++) {
                                        var m = messages[i];
                                        var isMe = m.sender_id === currentUserId;
                                        var time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                        var imageTag = m.image_url ? '<img src="' + m.image_url + '" class="rounded-xl mt-1.5 max-h-60 object-cover cursor-pointer" onclick="window.open(\'' + m.image_url + '\')">' : '';

                                        if (isMe) {
                                            html += '<div class="flex justify-end gap-2 my-1.5 group">' +
                                                '<button onclick="deleteMsg(' + m.id + ')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs self-center transition-opacity" title="Xóa tin nhắn">🗑️</button>' +
                                                '<div class="max-w-[70%] text-right">' +
                                                    '<div class="bg-emerald-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-none shadow-xs text-left inline-block">' +
                                                        (m.content ? '<span>' + m.content + '</span>' : '') +
                                                        imageTag +
                                                    '</div>' +
                                                    '<span class="text-[10px] text-emerald-800/60 block mt-0.5">' + time + '</span>' +
                                                '</div>' +
                                            '</div>';
                                        } else {
                                            html += '<div class="flex items-start gap-2.5 my-1.5">' +
                                                '<img src="' + m.sender_avatar + '" class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-emerald-200">' +
                                                '<div class="max-w-[70%]">' +
                                                    '<span class="text-[11px] font-semibold text-slate-700 block mb-0.5">' + m.sender_name + '</span>' +
                                                    '<div class="bg-white border border-emerald-100 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none shadow-xs inline-block">' +
                                                        (m.content ? '<span>' + m.content + '</span>' : '') +
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
                                });
                        }

                        // 9. GỬI TIN NHẮN
                        function sendMessage(e) {
                            e.preventDefault();
                            var input = document.getElementById('msg-input');
                            var imgInput = document.getElementById('msg-image-url');
                            var content = input.value.trim();
                            var image_url = imgInput ? imgInput.value.trim() : '';

                            if (!content && !image_url) return;

                            input.value = '';
                            if (imgInput) imgInput.value = '';
                            document.getElementById('media-input-box').classList.add('hidden');

                            fetch('/api/messages', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    conversation_id: activeConvId,
                                    content: content,
                                    image_url: image_url
                                })
                            }).then(function() {
                                loadMessages();
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
                            input.value = emoji;
                            input.focus();
                        }

                        function toggleMediaInput() {
                            var box = document.getElementById('media-input-box');
                            box.classList.toggle('hidden');
                        }

                        function openCreateGroupModal() {
                            document.getElementById('group-modal').classList.remove('hidden');
                        }
                        function closeCreateGroupModal() {
                            document.getElementById('group-modal').classList.add('hidden');
                        }

                        window.onload = function() {
                            if (activeConvId) {
                                var card = document.getElementById('conv-item-' + activeConvId);
                                if (card) card.click();
                            }
                        };
                    </script>
                </body>
                </html>
            `);
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GreenChat running on port ${PORT}`));
