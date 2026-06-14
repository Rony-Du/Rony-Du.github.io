const SUPABASE_URL = 'https://sihxiuysiczzxlzrirzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dxNbb_jDiOMnIaADtbl41g_e_UfDHgW';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== 在一起天数（设个起始日）=====
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
  document.getElementById('chat-box').innerHTML = (msgs||[]).map(m =>
    `<div class="msg"><span class="who">${m.sender}：</span>${m.content}</div>`
  ).join('');
  document.getElementById('chat-box').scrollTop = 9999;
}
window.sendMsg = async () => {
  const sender = document.getElementById('sender').value;
  const content = document.getElementById('msg-input').value.trim();
  if (!content) return;
  await sb.from('love_messages').insert({ sender, content });
  document.getElementById('msg-input').value = '';
};

// 订阅 Realtime INSERT[6](@ref)
sb.channel('public:love_messages')
  .on('postgres_changes', { event:'INSERT', schema:'public', table:'love_messages' },
    payload => {
      const m = payload.new;
      document.getElementById('chat-box').innerHTML +=
        `<div class="msg"><span class="who">${m.sender}：</span>${m.content}</div>`;
      document.getElementById('chat-box').scrollTop = 9999;
    })
  .subscribe(status => {
    document.getElementById('presence').textContent =
      status === 'SUBSCRIBED' ? '🟢 实时连接已建立，等 TA上线～' : '⚠️ 连接异常';
  });

loadMsgs();

// ===== 恋爱存储器 =====
async function loadMemories() {
  const { data } = await sb.from('love_memories')
    .select('*').order('created_at','desc');
  document.getElementById('mem-list').innerHTML = (data||[]).map(m =>
    `<div class="card"><strong>${m.mood} ${m.title}</strong><br>${m.content}
     <br><small>${new Date(m.created_at).toLocaleDateString()}</small></div>`
  ).join('');
}
window.saveMemory = async () => {
  const title = document.getElementById('mem-title').value.trim();
  const content = document.getElementById('mem-content').value.trim();
  const mood = document.getElementById('mem-mood').value;
  if (!title || !content) return;
  await sb.from('love_memories').insert({ title, content, mood });
  document.getElementById('mem-title').value = '';
  document.getElementById('mem-content').value = '';
  loadMemories();
};
loadMemories();
