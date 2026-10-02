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

const APP_VERSION = "v1.0.0"; // Phục vụ demo CI/CD v1.0 -> v2.0

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

// Middleware xác thực người dùng qua cookie
function authMiddleware(req, res, next) {
    const cookies = parseCookies(req);
    const userId = cookies.greenchat_user_id;
    if (!userId) {
        req.user = null;
        return next();
    }
    db.query('SELECT id, email, full_name, avatar_url, status FROM users WHERE id = ?', [userId], (err, results) => {
        if (!err && results.length > 0) {
            req.user = results[0];
        } else {
            req.user = null;
        }
        next();
    });
}

app.use(authMiddleware);

// ==================== AUTH ROUTES (GMAIL) ====================

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
                
                <!-- GreenChat Brand Header -->
                <div class="text-center space-y-2">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-3xl shadow-lg shadow-emerald-600/30">
                        🌿
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800">GreenChat</h2>
                    <p class="text-xs text-emerald-700 font-medium">Hệ thống nhắn tin nhóm nội bộ DevOps</p>
                </div>

                ${errorMsg ? `<div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">${errorMsg}</div>` : ''}
                ${successMsg ? `<div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">${successMsg}</div>` : ''}

                <!-- Tabs: Đăng nhập / Đăng ký -->
                <div class="flex border-b border-emerald-100 text-sm font-semibold">
                    <button id="tab-login-btn" onclick="showTab('login')" class="flex-1 pb-3 text-emerald-600 border-b-2 border-emerald-600 transition-colors">
                        Đăng nhập
                    </button>
                    <button id="tab-register-btn" onclick="showTab('register')" class="flex-1 pb-3 text-slate-400 hover:text-slate-700 transition-colors">
                        Đăng ký Gmail mới
                    </button>
                </div>

                <!-- FORM ĐĂNG NHẬP -->
                <form id="form-login" method="POST" action="/login" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ Gmail</label>
                        <input type="email" name="email" placeholder="tentaikhoan@gmail.com" required
                            class="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
                        <input type="password" name="password" placeholder="Nhập mật khẩu" required
                            class="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                    </div>

                    <button type="submit" 
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20">
                        Đăng nhập với Gmail
                    </button>
                </form>

                <!-- FORM ĐĂNG KÝ GMAIL -->
                <form id="form-register" method="POST" action="/register" class="space-y-3.5 hidden">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Họ và tên của bạn</label>
                        <input type="text" name="full_name" placeholder="Nguyễn Văn A" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Gmail của bạn</label>
                        <input type="email" name="email" placeholder="tentaikhoan@gmail.com" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
                        <input type="password" name="password" placeholder="Tạo mật khẩu mới" required
                            class="w-full px-3.5 py-2 bg-emerald-50/40 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                    </div>

                    <button type="submit" 
                        class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md">
                        Đăng ký tài khoản GreenChat
                    </button>
                </form>

                <!-- Box gợi ý tài khoản mẫu -->
                <div class="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                    <p class="font-bold flex items-center gap-1">🔑 Tài khoản có sẵn để test nhanh:</p>
                    <p>• <b>tuss.devops@gmail.com</b> / pass: <b>123456</b> (Đặng Tuấn)</p>
                    <p>• <b>hoangnam.le@gmail.com</b> / pass: <b>123456</b> (Lê Hoàng Nam)</p>
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

// Xử lý Đăng nhập
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email.trim(), password], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/login?error=' + encodeURIComponent('Gmail hoặc mật khẩu không chính xác!'));
        }
        res.setHeader('Set-Cookie', `greenchat_user_id=${results[0].id}; Path=/; HttpOnly`);
        res.redirect('/');
    });
});

// Xử lý Đăng ký bằng Gmail
app.post('/register', (req, res) => {
    const { full_name, email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const avatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanEmail)}`;

    db.query(
        'INSERT INTO users (full_name, email, password, avatar_url) VALUES (?, ?, ?, ?)',
        [full_name, cleanEmail, password, avatar],
        (err, result) => {
            if (err) {
                return res.redirect('/login?error=' + encodeURIComponent('Địa chỉ Gmail này đã được đăng ký trước đó!'));
            }
            res.setHeader('Set-Cookie', `greenchat_user_id=${result.insertId}; Path=/; HttpOnly`);
            res.redirect('/');
        }
    );
});

// Xử lý Đăng xuất
app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'greenchat_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/login');
});

// ==================== GREENCHAT MAIN INTERFACE ====================

app.get('/', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const activeRoomId = parseInt(req.query.room) || 1;

    // Lấy danh sách các phòng chat
    db.query('SELECT * FROM rooms ORDER BY id ASC', (err, rooms) => {
        if (err) return res.status(500).send(`Lỗi database: ${err.message}`);

        const currentRoom = (rooms || []).find(r => r.id === activeRoomId) || rooms[0] || { id: 1, name: 'Nhóm Chung', description: '' };

        // Lấy tin nhắn của phòng hiện tại
        const sqlMessages = `
            SELECT m.*, u.full_name AS sender_name, u.avatar_url AS sender_avatar, u.email AS sender_email
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.room_id = ?
            ORDER BY m.id ASC
        `;

        db.query(sqlMessages, [currentRoom.id], (err, messages) => {
            // Lấy danh sách thành viên online
            db.query('SELECT id, full_name, avatar_url, email FROM users ORDER BY id ASC', (err, members) => {
                
                // Render danh sách phòng bên sidebar
                const roomsHtml = (rooms || []).map(r => {
                    const isActive = r.id === currentRoom.id;
                    return `
                        <a href="/?room=${r.id}" class="flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 shadow-xs' : 'hover:bg-slate-100/80 text-slate-700'}">
                            <div class="w-10 h-10 rounded-xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center text-xl flex-shrink-0">
                                ${r.avatar || '🌿'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-xs truncate ${isActive ? 'text-emerald-800 font-bold' : 'text-slate-800'}">${r.name}</h4>
                                <p class="text-[11px] text-slate-400 truncate">${r.description || 'Kênh chat nhóm'}</p>
                            </div>
                        </a>
                    `;
                }).join('');

                // Render tin nhắn trong phòng
                const messagesHtml = (messages || []).map(m => {
                    const isMe = m.user_id === req.user.id;
                    const timeStr = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                    if (isMe) {
                        return `
                            <div class="flex justify-end gap-2 my-2">
                                <div class="max-w-[70%] text-right">
                                    <div class="bg-emerald-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-none shadow-xs text-left inline-block">
                                        ${m.content}
                                    </div>
                                    <span class="text-[10px] text-emerald-700/60 block mt-0.5">${timeStr}</span>
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="flex items-start gap-2.5 my-2">
                                <img src="${m.sender_avatar}" class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-emerald-200">
                                <div class="max-w-[70%]">
                                    <span class="text-[11px] font-semibold text-slate-700 block mb-0.5">${m.sender_name}</span>
                                    <div class="bg-white border border-emerald-100 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none shadow-xs inline-block">
                                        ${m.content}
                                    </div>
                                    <span class="text-[10px] text-slate-400 block mt-0.5">${timeStr}</span>
                                </div>
                            </div>
                        `;
                    }
                }).join('');

                // Render danh sách thành viên bên phải
                const membersHtml = (members || []).map(u => `
                    <li class="flex items-center justify-between p-2 hover:bg-emerald-50/50 rounded-lg transition-colors">
                        <div class="flex items-center gap-2.5">
                            <div class="relative">
                                <img src="${u.avatar_url}" class="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-200">
                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                            </div>
                            <div>
                                <span class="font-semibold text-xs text-slate-800 block">${u.full_name}</span>
                                <span class="text-[10px] text-slate-400 truncate block max-w-[120px]">${u.email}</span>
                            </div>
                        </div>
                    </li>
                `).join('');

                res.send(`
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>GreenChat - ${currentRoom.name}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f0fdf4; }
                        </style>
                    </head>
                    <body class="h-screen flex overflow-hidden">

                        <!-- 1. LEFT RAIL ICON NAVIGATION (MÀU XANH LÁ ĐẬM) -->
                        <nav class="w-16 bg-emerald-700 flex flex-col items-center py-4 justify-between flex-shrink-0 z-20 shadow-md">
                            <div class="flex flex-col items-center gap-6 w-full">
                                <div class="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-bold text-xl shadow-sm">
                                    🌿
                                </div>
                                <a href="/" class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg shadow-inner" title="Tin nhắn">
                                    💬
                                </a>
                                <a href="#" class="w-10 h-10 rounded-xl hover:bg-white/10 text-white/80 flex items-center justify-center text-lg transition-colors" title="Danh bạ">
                                    👥
                                </a>
                            </div>

                            <div class="flex flex-col items-center gap-4">
                                <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">${APP_VERSION}</span>
                                <a href="/logout" title="Đăng xuất" class="text-white/80 hover:text-white p-2 text-lg">
                                    🚪
                                </a>
                            </div>
                        </nav>

                        <!-- 2. MIDDLE COLUMN: DANH SÁCH NHÓM CHAT -->
                        <div class="w-72 bg-white border-r border-emerald-100 flex flex-col flex-shrink-0">
                            <!-- Header user profile -->
                            <div class="p-3.5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/30">
                                <div class="flex items-center gap-2.5">
                                    <img src="${req.user.avatar_url}" class="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-600">
                                    <div>
                                        <h3 class="font-bold text-xs text-slate-800">${req.user.full_name}</h3>
                                        <span class="text-[10px] text-emerald-600 font-medium">● Đang hoạt động</span>
                                    </div>
                                </div>
                                <a href="/logout" class="text-xs text-slate-400 hover:text-rose-500" title="Đăng xuất">Thoát</a>
                            </div>

                            <!-- Search & List rooms -->
                            <div class="p-3 border-b border-slate-100">
                                <input type="text" placeholder="Tìm kiếm nhóm chat..." 
                                    class="w-full bg-emerald-50/50 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-emerald-100">
                            </div>

                            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                                <div class="text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider px-2 py-1">Kênh Nhóm DevOps</div>
                                ${roomsHtml}
                            </div>

                            <!-- Tạo nhóm mới -->
                            <div class="p-3 border-t border-emerald-100 bg-emerald-50/40">
                                <form method="POST" action="/rooms" class="flex gap-1.5">
                                    <input type="text" name="name" placeholder="+ Tên nhóm mới..." required
                                        class="flex-1 text-xs px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                    <button type="submit" class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors">Thêm</button>
                                </form>
                            </div>
                        </div>

                        <!-- 3. RIGHT COLUMN: KHUNG CHAT CHÍNH (NỀN XANH LÁ PASTEL SẠCH SẼ) -->
                        <div class="flex-1 flex flex-col bg-[#f0fdf4] overflow-hidden">
                            <!-- Chat Room Header -->
                            <div class="h-14 bg-white border-b border-emerald-100 px-5 flex items-center justify-between flex-shrink-0 shadow-xs">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                                        ${currentRoom.avatar || '🌿'}
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-sm text-slate-800">${currentRoom.name}</h3>
                                        <p class="text-[11px] text-slate-400">${currentRoom.description || 'Kênh trao đổi nhóm'}</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3 text-xs text-slate-500">
                                    <span class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-mono border border-emerald-200">host: ${os.hostname().slice(0, 8)}</span>
                                    <span class="hidden md:inline">Thành viên: <b>${members ? members.length : 0}</b></span>
                                </div>
                            </div>

                            <!-- Main Body: Message Stream + Right Members Sidebar -->
                            <div class="flex-1 flex overflow-hidden">
                                
                                <!-- Tin nhắn chat -->
                                <div class="flex-1 flex flex-col overflow-hidden">
                                    <div id="messages-box" class="flex-1 overflow-y-auto p-4 space-y-1">
                                        ${messagesHtml.length ? messagesHtml : '<div class="text-center py-10 text-slate-400 text-xs">Chưa có tin nhắn nào trong nhóm. Hãy gửi tin đầu tiên!</div>'}
                                    </div>

                                    <!-- Thanh nhập tin nhắn -->
                                    <div class="p-3 bg-white border-t border-emerald-100 flex-shrink-0">
                                        <!-- Quick Reactions -->
                                        <div class="flex gap-3 mb-2 text-sm text-slate-400">
                                            <button onclick="sendQuick('👍')" class="hover:scale-125 transition-transform" title="Like">👍</button>
                                            <button onclick="sendQuick('🌿')" class="hover:scale-125 transition-transform" title="Green Leaf">🌿</button>
                                            <button onclick="sendQuick('🚀')" class="hover:scale-125 transition-transform" title="Rocket">🚀</button>
                                            <button onclick="sendQuick('🔥')" class="hover:scale-125 transition-transform" title="Fire">🔥</button>
                                        </div>

                                        <form method="POST" action="/messages" class="flex items-center gap-2">
                                            <input type="hidden" name="room_id" value="${currentRoom.id}">
                                            <input type="text" id="msg-input" name="content" placeholder="Nhập tin nhắn tới #${currentRoom.name}..." required autocomplete="off"
                                                class="flex-1 bg-emerald-50/50 text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white border border-emerald-100 transition-all">
                                            <button type="submit" 
                                                class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-600/20">
                                                Gửi
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <!-- Cột phụ: Danh sách thành viên trong nhóm -->
                                <aside class="w-60 bg-white border-l border-emerald-100 p-3 hidden lg:block overflow-y-auto">
                                    <h4 class="text-xs font-bold text-emerald-800/70 uppercase tracking-wider mb-3">Thành viên (${members ? members.length : 0})</h4>
                                    <ul class="space-y-1">
                                        ${membersHtml}
                                    </ul>
                                </aside>

                            </div>
                        </div>

                        <script>
                            // Tự động cuộn xuống tin nhắn cuối cùng khi tải trang
                            const box = document.getElementById('messages-box');
                            if (box) {
                                box.scrollTop = box.scrollHeight;
                            }

                            // Gửi nhanh reaction
                            function sendQuick(emoji) {
                                document.getElementById('msg-input').value = emoji;
                                document.getElementById('msg-input').focus();
                            }
                        </script>
                    </body>
                    </html>
                `);
            });
        });
    });
});

// Gửi tin nhắn mới
app.post('/messages', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const { room_id, content } = req.body;
    db.query(
        'INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)',
        [room_id, req.user.id, content],
        () => res.redirect(`/?room=${room_id}`)
    );
});

// Tạo nhóm chat mới
app.post('/rooms', (req, res) => {
    if (!req.user) return res.redirect('/login');
    const { name } = req.body;
    db.query(
        'INSERT INTO rooms (name, description, avatar) VALUES (?, ?, ?)',
        [name, 'Nhóm tạo bởi ' + req.user.full_name, '🌿'],
        (err, result) => {
            res.redirect(`/?room=${result.insertId}`);
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GreenChat App running on port ${PORT}`));
