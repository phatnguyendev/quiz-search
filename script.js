/* ========= CẤU HÌNH ========= */
// Thay URL bên dưới bằng Web App URL của bạn nếu khác.
const API_URL = 'https://script.google.com/macros/s/AKfycbw4HwzGR3sNDq6xBg-EhB7d21AA0NkdMXOwxdYRcYlKHoAoBiHVjHTPRT2P1tIv9Z5D/exec';


// (tuỳ chọn) dữ liệu câu hỏi local
let quizData = [];
fetch('all_questions_list.json')
  .then(r => r.ok ? r.json() : [])
  .then(data => { quizData = Array.isArray(data) ? data : []; })
  .catch(() => {});

/* ========= TIỆN ÍCH ========= */
function uuid() {
  const key = 'deviceId';
  let id = localStorage.getItem(key);
  if (!id) {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    id = Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(key, id);
  }
  return id;
}
function saveSession({ sbd, token, role }) {
  localStorage.setItem('sbd', sbd);
  localStorage.setItem('token', token || '');
  if (role) localStorage.setItem('role', role);
}
function getSession() {
  return { sbd: localStorage.getItem('sbd') || '', token: localStorage.getItem('token') || '', role: localStorage.getItem('role') || '', deviceId: uuid() };
}
function clearSession() {
  localStorage.removeItem('sbd');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

/* ========= UI REF ========= */
const searchBox  = document.getElementById('searchBox');
const resultsDiv = document.getElementById('results');
const lockOverlay = document.getElementById('lockOverlay');
const sbdInput   = document.getElementById('sbdInput');
const btnLogin   = document.getElementById('btnLogin');
const loginMsg   = document.getElementById('loginMsg');

const adminPanel = document.getElementById('adminPanel');
const adminKey   = document.getElementById('adminKey');
const resetSbd   = document.getElementById('resetSbd');
const btnReset   = document.getElementById('btnReset');
const btnList    = document.getElementById('btnList');
const adminOut   = document.getElementById('adminOut');
const roleBadge  = document.getElementById('roleBadge');

// Auth bar
const authBar = document.getElementById('authBar');
const authInfo = document.getElementById('authInfo');
const btnLogout = document.getElementById('btnLogout');
const btnClearDev = document.getElementById('btnClearDev');

/* ========= API ========= */
async function apiCheck(sbd) {
  const url = `${API_URL}?action=check&sbd=${encodeURIComponent(sbd)}&deviceId=${encodeURIComponent(uuid())}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('Network error');
  return res.json();
}
async function apiReset(key, sbd) {
  const url = `${API_URL}?action=reset&key=${encodeURIComponent(key)}&sbd=${encodeURIComponent(sbd)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('Network error');
  return res.json();
}
async function apiList(key) {
  const url = `${API_URL}?action=list&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

/* ========= AUTH FLOW ========= */
async function ensureAuth() {
  const sess = getSession();
  if (!sess.sbd || !sess.token) { showLogin(); setAuthBar(false); return false; }
  try {
    const rs = await apiCheck(sess.sbd);
    if (rs.ok) {
      saveSession({ sbd: sess.sbd, token: rs.token, role: rs.role });
      showRoleBadge(rs.role);
      setAuthBar(true);
      unlockSearch();
      return true;
    }
    clearSession();
    setAuthBar(false);
    showLogin(rs.message || 'Vui lòng đăng nhập lại.');
    return false;
  } catch (e) {
    setAuthBar(false);
    showLogin('Không thể kết nối máy chủ, thử lại sau.');
    return false;
  }
}

function showLogin(msg) {
  loginMsg.textContent = msg || '';
  lockOverlay.style.display = 'flex';
  searchBox.setAttribute('disabled', 'disabled');
}
function unlockSearch() {
  lockOverlay.style.display = 'none';
  searchBox.removeAttribute('disabled');
}
function showRoleBadge(role) {
  roleBadge.innerHTML = '';
  if (!role) return;
  const div = document.createElement('div');
  div.className = `alert ${role === 'SUPERADMIN' ? 'alert-info' : 'alert-secondary'} text-center`;
  div.textContent = role === 'SUPERADMIN'
    ? 'Bạn đang đăng nhập với quyền SUPERADMIN (đa thiết bị).'
    : 'Bạn đang đăng nhập với tài khoản thường.';
  roleBadge.appendChild(div);
}
function setAuthBar(show) {
  if (!show) { authBar.style.display = 'none'; authInfo.textContent = ''; return; }
  const sess = getSession();
  authBar.style.display = 'flex';
  authInfo.textContent = `Đang đăng nhập: ${sess.sbd} (${sess.role || 'USER'})`;
}

/* ========= EVENTS ========= */
btnLogin?.addEventListener('click', async () => {
  const sbd = (sbdInput.value || '').trim();
  if (!sbd) { loginMsg.textContent = 'Vui lòng nhập SBD'; return; }
  try {
    loginMsg.textContent = 'Đang kiểm tra...';
    const rs = await apiCheck(sbd);
    if (rs.ok) {
      saveSession({ sbd, token: rs.token, role: rs.role });
      showRoleBadge(rs.role);
      setAuthBar(true);
      unlockSearch();
      loginMsg.textContent = '';
    } else {
      loginMsg.textContent = rs.message || 'Không được phép truy cập';
    }
  } catch {
    loginMsg.textContent = 'Lỗi kết nối. Thử lại.';
  }
});

btnLogout?.addEventListener('click', () => {
  clearSession();
  showRoleBadge('');
  setAuthBar(false);
  searchBox.value = '';
  resultsDiv.innerHTML = '';
  showLogin('Đã đăng xuất trên máy này.');
});

btnClearDev?.addEventListener('click', () => {
  if (confirm('Chỉ xóa deviceId trong trình duyệt này (KHÔNG giải phóng trên server). Tiếp tục?')) {
    localStorage.removeItem('deviceId');
    alert('Đã xóa deviceId cục bộ. Muốn chuyển SBD sang máy khác hãy dùng Reset (server).');
  }
});

searchBox.addEventListener('input', function () {
  const keyword = this.value.toLowerCase().trim();
  resultsDiv.innerHTML = '';
  if (!keyword) return;

  const sess = getSession();
  if (!sess.token || !sess.sbd) {
    showLogin('Hết phiên đăng nhập, vui lòng đăng nhập lại.');
    return;
  }

  const items = (quizData || []).filter(q => (q.question || '').toLowerCase().includes(keyword));
  if (items.length === 0) { resultsDiv.textContent = 'Không tìm thấy câu hỏi nào.'; return; }
  for (const it of items) {
    const div = document.createElement('div');
    div.className = 'alert alert-success';
    div.innerHTML = `<b>Đáp án:</b> ${it.answer}`;
    resultsDiv.appendChild(div);
  }
});

(function enableAdminPanel() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('admin') === '1') adminPanel.classList.remove('hidden');
})();
btnReset?.addEventListener('click', async () => {
  adminOut.textContent = 'Đang reset...';
  try {
    const rs = await apiReset((adminKey.value || '').trim(), (resetSbd.value || '').trim());
    adminOut.textContent = JSON.stringify(rs, null, 2);
  } catch { adminOut.textContent = 'Lỗi kết nối.'; }
});
btnList?.addEventListener('click', async () => {
  adminOut.textContent = 'Đang tải danh sách...';
  try {
    const rs = await apiList((adminKey.value || '').trim());
    adminOut.textContent = JSON.stringify(rs, null, 2);
  } catch { adminOut.textContent = 'Lỗi kết nối.'; }
});

/* ========= BOOT ========= */
ensureAuth();


// let quizData = [];

// fetch('all_questions_list.json')
//   .then(response => response.json())
//   .then(data => quizData = data);

// document.getElementById('searchBox').addEventListener('input', function () {
//   const keyword = this.value.toLowerCase();
//   const resultsDiv = document.getElementById('results');
//   resultsDiv.innerHTML = '';

//   const results = quizData.filter(q => q.question.toLowerCase().includes(keyword));

//   results.forEach(item => {
//     const div = document.createElement('div');
//     div.innerHTML = `<div class="alert alert-success" role="alert"><b>Đáp án: ${item.answer} </b></div>`;
//     resultsDiv.appendChild(div);
//   });

//   if (results.length === 0 && keyword) {
//     resultsDiv.innerHTML = 'Không tìm thấy câu hỏi nào.';
//   }
// });
