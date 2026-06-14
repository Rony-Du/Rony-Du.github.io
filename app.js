// 替换为你的真实 Supabase 凭据
const SUPABASE_URL = 'https://sihxiuysiczzxlzrirzx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHhpdXlzaWN6enhsenJpcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mjc1OTUsImV4cCI6MjA5NzAwMzU5NX0.4JbMXbg2HPtOBrkz6McYI_EK8oitU7F2cHaDPsa2LP8';

// 避免重复声明：检查是否已存在
if (typeof sb === 'undefined') {
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ===== 在一起天数 =====
const START_DATE = new Date('2025-09-01');
document.getElementById('days').textContent =
  Math.floor((Date.now() - START_DATE) / 86400000);

// ===== 实时聊天 =====
async function loadMsgs() {
  const { data } = await sb.from('love_messages')
    .select('*').order('created_at');
  renderMsgs(data);
}

function renderMsgs(msgs) {
  document.getElementById('chat-box').innerHTML = (msgs || []).map(m =>
    `<div class="msg"><span class="who">${m.sender}：</span>${m.content}</div>`
  ).join('');
  document.getElementById('chat-box').scrollTop = 9999;
}

// 用函数声明方式，确保全局可用
function sendMsg() {
  const sender = document.getElementById('sender').value;
  const content = document.getElementById('msg-input').value.trim();
  if (!content) return;
  
  sb.from('love_messages').insert({ sender, content }).then(() => {
    document.getElementById('msg-input').value = '';
  });
}

// 订阅 Realtime
sb.channel('public:love_messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'love_messages' },
    payload => {
      const m = payload.new;
      const chatBox = document.getElementById('chat-box');
      chatBox.innerHTML += 
        `<div class="msg"><span class="who">${m.sender}：</span>${m.content}</div>`;
      chatBox.scrollTop = 9999;
    })
  .subscribe(status => {
    document.getElementById('presence').textContent =
      status === 'SUBSCRIBED' ? '🟢 实时连接已建立，等 TA上线～' : '⚠️ 连接异常';
  });

loadMsgs();

// ===== 恋爱存储器 =====
async function loadMemories() {
  const { data } = await sb.from('love_memories')
    .select('*').order('created_at', { ascending: false });
  document.getElementById('mem-list').innerHTML = (data || []).map(m =>
    `<div class="card"><strong>${m.mood} ${m.title}</strong><br>${m.content}
     <br><small>${new Date(m.created_at).toLocaleDateString()}</small></div>`
  ).join('');
}

function saveMemory() {
  const title = document.getElementById('mem-title').value.trim();
  const content = document.getElementById('mem-content').value.trim();
  const mood = document.getElementById('mem-mood').value;
  if (!title || !content) return;
  
  sb.from('love_memories').insert({ title, content, mood }).then(() => {
    document.getElementById('mem-title').value = '';
    document.getElementById('mem-content').value = '';
    loadMemories();
  });
}

loadMemories();
