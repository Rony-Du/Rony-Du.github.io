// =============================================
// 🔑 在这里填写你的 Supabase 项目信息！
// =============================================
const SUPABASE_URL = 'https://你的项目ID.supabase.co';     // ← 替换
const SUPABASE_ANON_KEY = '你的anon公钥';                  // ← 替换

// 使用 ES Module 动态导入 Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 初始化 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// 全局变量
// =============================================
let currentRoom = 'default';
let myNickname = localStorage.getItem('love_nickname') || '';
let subscription = null;

// =============================================
// DOM 元素引用
// =============================================
const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');
const nicknameInput = document.getElementById('nicknameInput');
const statusDot = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');

// =============================================
// 初始化
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  // 恢复昵称
  if (myNickname) {
    nicknameInput.value = myNickname;
  } else {
    myNickname = '同学' + Math.floor(Math.random() * 1000);
    nicknameInput.value = myNickname;
    localStorage.setItem('love_nickname', myNickname);
  }

  // 加载历史消息
  await loadHistoryMessages();
  
  // 订阅实时消息
  subscribeToRealtime();
});

// =============================================
// 保存昵称
// =============================================
nicknameInput.addEventListener('change', () => {
  myNickname = nicknameInput.value.trim() || '匿名同学';
  localStorage.setItem('love_nickname', myNickname);
});

// =============================================
// 加载历史消息
// =============================================
async function loadHistoryMessages() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', currentRoom)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    chatBox.innerHTML = '';
    
    if (data && data.length > 0) {
      data.forEach(msg => appendMessage(msg, false));
    } else {
      chatBox.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px 0;">💭 还没有消息，说点什么吧～</div>';
    }
    
    scrollToBottom();
  } catch (err) {
    console.error('加载历史消息失败:', err);
    chatBox.innerHTML = '<div style="text-align:center;color:#e57373;padding:40px 0;">❌ 加载失败，请检查网络</div>';
  }
}

// =============================================
// 订阅实时消息
// =============================================
function subscribeToRealtime() {
  // 取消之前的订阅
  if (subscription) {
    supabase.removeChannel(subscription);
  }

  updateConnectionStatus('connecting', '连接中...');

  subscription = supabase
    .channel(`room-${currentRoom}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoom}`
      },
      (payload) => {
        const newMsg = payload.new;
        // 如果是自己发的消息，不重复添加
        const existing = chatBox.querySelector(`[data-id="${newMsg.id}"]`);
        if (!existing) {
          appendMessage(newMsg, true);
          scrollToBottom();
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        updateConnectionStatus('online', '🟢 已连接');
      } else if (status === 'CHANNEL_ERROR') {
        updateConnectionStatus('offline', '🔴 连接失败，尝试重连...');
        setTimeout(() => subscribeToRealtime(), 3000);
      } else {
        updateConnectionStatus('connecting', '⏳ 连接中...');
      }
    });
}

// =============================================
// 发送消息
// =============================================
async function sendMsg() {
  const content = msgInput.value.trim();
  if (!content) return;

  const sender = myNickname || '匿名同学';

  try {
    // 先禁用按钮防止重复发送
    document.getElementById('sendBtn').disabled = true;
    
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender: sender,
          content: content,
          room_id: currentRoom
        }
      ])
      .select();

    if (error) throw error;

    // 清空输入框
    msgInput.value = '';
    
    // 如果有返回数据，立即显示
    if (data && data.length > 0) {
      appendMessage(data[0], false);
      scrollToBottom();
    }
  } catch (err) {
    console.error('发送失败:', err);
    alert('发送失败，请检查网络后重试');
  } finally {
    document.getElementById('sendBtn').disabled = false;
    msgInput.focus();
  }
}

// =============================================
// 添加消息到界面
// =============================================
function appendMessage(msg, isRealtime) {
  // 移除"暂无消息"提示
  const emptyHint = chatBox.querySelector('[style*="text-align:center"]');
  if (emptyHint) emptyHint.remove();

  const div = document.createElement('div');
  div.className = 'msg';
  div.dataset.id = msg.id;
  
  // 判断是否是自己的消息
  const isMe = msg.sender === myNickname;
  div.classList.add(isMe ? 'me' : 'you');

  // 格式化时间
  const time = new Date(msg.created_at).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  div.innerHTML = `
    <div class="bubble">
      <strong style="font-size:0.78rem;color:${isMe ? '#388e3c' : '#1565c0'}">
        ${escapeHtml(msg.sender)}
      </strong>
      <br>
      ${escapeHtml(msg.content)}
      <div class="msg-time">${time}</div>
    </div>
  `;

  // 如果是实时消息，添加动画效果
  if (isRealtime) {
    div.style.animation = 'fadeIn 0.3s ease';
  }

  chatBox.appendChild(div);
}

// =============================================
// 切换聊天室
// =============================================
function switchRoom(roomId) {
  currentRoom = roomId;
  chatBox.innerHTML = '<div class="loading-msg">切换房间中...</div>';
  
  // 重新订阅
  subscribeToRealtime();
  
  // 加载新房间的历史消息
  setTimeout(() => loadHistoryMessages(), 500);
}

// =============================================
// 辅助函数
// =============================================
function scrollToBottom() {
  setTimeout(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 50);
}

function updateConnectionStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = text;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================
// 原有的标签切换、记忆册、计时器功能（保持不变）
// =============================================

// 标签页切换
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
}

// 记忆册功能
const memList = document.getElementById('memList');
function loadMemory() {
  const data = JSON.parse(localStorage.getItem('love_memory') || '[]');
  memList.innerHTML = data.map(m =>
    `<li>📅 <b>${m.date}</b> — ${escapeHtml(m.text)} <span style="float:right;cursor:pointer;color:#e57373;" onclick="delMem(${m.id})">✕</span></li>`
  ).join('');
}
function addMemory() {
  const date = document.getElementById('memDate').value || new Date().toISOString().slice(0,10);
  const text = document.getElementById('memText').value.trim();
  if (!text) return alert('写点什么吧～');
  let data = JSON.parse(localStorage.getItem('love_memory') || '[]');
  const id = Date.now();
  data.unshift({ id, date, text });
  localStorage.setItem('love_memory', JSON.stringify(data));
  document.getElementById('memText').value = '';
  loadMemory();
}
function delMem(id) {
  let data = JSON.parse(localStorage.getItem('love_memory') || '[]');
  data = data.filter(m => m.id !== id);
  localStorage.setItem('love_memory', JSON.stringify(data));
  loadMemory();
}
loadMemory();

// 在一起天数
function setAnniversary() {
  localStorage.setItem('love_anniv', document.getElementById('annivInput').value);
  calcTimer();
}
function calcTimer() {
  const anniv = localStorage.getItem('love_anniv') || '2025-09-01';
  document.getElementById('annivInput').value = anniv;
  const diff = Math.floor((Date.now() - new Date(anniv)) / 86400000);
  document.getElementById('loveTimer').textContent =
    diff >= 0 ? `${diff} 天 💕` : `还有 ${Math.abs(diff)} 天开始 ⏳`;
}
calcTimer();
setInterval(calcTimer, 60000);

// 添加淡入动画
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

// 让 switchTab 和 sendMsg 成为全局函数（因为 HTML onclick 需要它们）
window.switchTab = switchTab;
window.sendMsg = sendMsg;
window.switchRoom = switchRoom;
window.addMemory = addMemory;
window.delMem = delMem;
window.setAnniversary = setAnniversary;
