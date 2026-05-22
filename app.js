const initialState = {
  familyName: "家裡小隊",
  inviteCode: "FAM-8392",
  backendStatus: "已同步",
  currentUser: "",
  role: "member",
  selectedTemplate: "買菜",
  selectedMember: "",
  selectedTime: "今天",
  addMode: "task",
  selectedQuestion: "今天狀況如何？",
  selectedStatus: "😄",
  weatherMode: "auto",
  heroMode: "auto",
  dateOffsetDays: 0,
  pendingCheckin: null,
  members: [],
  tasks: [],
  feed: [],
  chat: [],
};

let state = structuredClone(initialState);
let pendingDeleteTaskId = null;
let familyId = null;
let remoteReady = false;
let realtimeChannel = null;
let syncTimer = null;
let syncInFlight = false;
let soundEnabled = false;
let audioContext = null;
let lastSeenMessageId = null;
let lastSeenTaskId = null;
let hasLoadedRemoteOnce = false;
let pushEnabled = false;

const SUPABASE_URL = "https://krwsmhrakpcdmocckkmf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtyd3NtaHJha3BjZG1vY2Nra21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTczNzksImV4cCI6MjA5NDk3MzM3OX0.y-msZ7K96ldRBgUqQUCK90SPZEM9BKaQqfKGV1WbNSs";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const statusOptions = [
  { emoji: "😄", label: "OK" },
  { emoji: "😐", label: "普通" },
  { emoji: "😷", label: "不舒服" },
  { emoji: "😴", label: "累" },
  { emoji: "🚨", label: "幫忙" },
];

const templates = [
  { icon: "assets/icons/Task ICON/買菜.png", title: "買菜" },
  { icon: "assets/icons/Task ICON/到垃圾.png", title: "倒垃圾" },
  { icon: "assets/icons/Task ICON/吃藥.png", title: "吃藥" },
  { icon: "assets/icons/Task ICON/量血壓.png", title: "量血壓" },
  { icon: "assets/icons/Task ICON/接送.png", title: "接送" },
  { icon: "assets/icons/Task ICON/繳費.png", title: "繳費" },
  { icon: "assets/icons/Task ICON/拿包裹.png", title: "拿包裹" },
  { icon: "assets/icons/Task ICON/打電話.png", title: "打電話" },
];

const questionTemplates = ["今天狀況如何？", "到家了嗎？", "吃飯了嗎？", "需要幫忙嗎？"];

const screens = {
  today: document.querySelector("#todayScreen"),
  family: document.querySelector("#familyScreen"),
  add: document.querySelector("#addScreen"),
  chat: document.querySelector("#chatScreen"),
  admin: document.querySelector("#adminScreen"),
};

const navButtons = document.querySelectorAll("[data-screen]");
const statusPicker = document.querySelector("#statusPicker");
const todayMeta = document.querySelector("#todayMeta");
const heroImage = document.querySelector("#heroImage");
const templatePicker = document.querySelector("#templatePicker");
const memberPicker = document.querySelector("#memberPicker");
const todayTasks = document.querySelector("#todayTasks");
const adminTasks = document.querySelector("#adminTasks");
const memberList = document.querySelector("#memberList");
const todayFeed = document.querySelector("#todayFeed");
const chatList = document.querySelector("#chatList");
const checkinCard = document.querySelector("#pendingCheckinCard");
const checkinQuestionTitle = document.querySelector("#checkinQuestionTitle");
const checkinQuestionFrom = document.querySelector("#checkinQuestionFrom");
const checkinQuestionText = document.querySelector("#checkinQuestionText");
const statusNoteInput = document.querySelector("#statusNoteInput");
const selectedTemplateText = document.querySelector("#selectedTemplateText");
const selectedQuestionText = document.querySelector("#selectedQuestionText");
const selectedMemberText = document.querySelector("#selectedMemberText");
const selectedTimeText = document.querySelector("#selectedTimeText");
const addModeHint = document.querySelector("#addModeHint");
const roleToggle = document.querySelector("#roleToggle");
const chatInput = document.querySelector("#chatInput");
const createTaskButton = document.querySelector("#createTaskButton");
const taskModeButton = document.querySelector("#taskModeButton");
const checkinModeButton = document.querySelector("#checkinModeButton");
const taskPanel = document.querySelector("#taskPanel");
const checkinPanel = document.querySelector("#checkinPanel");
const questionPicker = document.querySelector("#questionPicker");
const customTaskInput = document.querySelector("#customTaskInput");
const customQuestionInput = document.querySelector("#customQuestionInput");
const memberPickerTitle = document.querySelector("#memberPickerTitle");
const selectAllButton = document.querySelector("#selectAllButton");
const timeBlock = document.querySelector("#timeBlock");
const sosConfirm = document.querySelector("#sosConfirm");
const deleteTaskConfirm = document.querySelector("#deleteTaskConfirm");
const deleteTaskTitle = document.querySelector("#deleteTaskTitle");
const deleteTaskMessage = document.querySelector("#deleteTaskMessage");
const identityLayer = document.querySelector("#identityLayer");
const identityOptions = document.querySelector("#identityOptions");
const identityNameInput = document.querySelector("#identityNameInput");
const identityJoinButton = document.querySelector("#identityJoinButton");
const chooseDateButton = document.querySelector("#chooseDateButton");
const customDateInput = document.querySelector("#customDateInput");
const datePickerRow = document.querySelector(".date-picker-row");
const inviteCode = document.querySelector("#inviteCode");
const inviteStatusText = document.querySelector("#inviteStatusText");
const syncStatusText = document.querySelector("#syncStatusText");
const familyNameText = document.querySelector("#familyNameText");
const soundToggleButton = document.querySelector("#soundToggleButton");
const pushToggleButton = document.querySelector("#pushToggleButton");
const heroModeText = document.querySelector("#heroModeText");
const dateModeText = document.querySelector("#dateModeText");
const identityStorageKey = "family-workspace-current-user";
const soundStorageKey = "family-workspace-sound-enabled";
const pushStorageKey = "family-workspace-push-enabled";
const demoCleanupKey = "family-workspace-demo-cleaned";
const demoMemberNames = ["Sam", "爸爸", "姐姐", "媽媽"];
const guestMember = { name: "訪客", short: "訪", tone: "tone-blue", health: "😐", note: "" };
const VAPID_PUBLIC_KEY = "BE7kssFjL-5QMkQk_I1l9c7hj43A2v6Q8cAAfWuPid5MP4-ewZCsut9puADBpgL6aq7NBI9s3yTQKBWFQPnVDKQ";

function switchScreen(name) {
  Object.entries(screens).forEach(([screenName, screen]) => {
    screen.classList.toggle("active", screenName === name);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === name);
  });
}

function render() {
  renderStatusPicker();
  renderTemplates();
  renderQuestions();
  renderMembers();
  renderTasks();
  renderFeed();
  renderChat();
  renderCheckin();
  renderRole();
  renderFamilySpace();
  renderIdentityOptions();
  renderTodayMeta();
  renderHeroBanner();
  selectedTemplateText.textContent = state.selectedTemplate;
  selectedQuestionText.textContent = state.selectedQuestion;
  selectedMemberText.textContent = state.selectedMember === "all" ? "大家" : state.selectedMember || "尚未選擇";
  selectedTimeText.textContent = state.selectedTime;
  createTaskButton.textContent = state.addMode === "task" ? "建立任務" : "送出狀態詢問";
  addModeHint.textContent = state.addMode === "task" ? "新增任務" : "問狀態";
  memberPickerTitle.textContent = state.addMode === "task" ? "給誰做" : "問誰";
  taskPanel.classList.toggle("active", state.addMode === "task");
  checkinPanel.classList.toggle("active", state.addMode === "checkin");
  timeBlock.style.display = state.addMode === "task" ? "grid" : "none";
  selectAllButton.classList.toggle("visible", state.addMode === "checkin");
  selectAllButton.classList.toggle("active", state.selectedMember === "all");
  taskModeButton.classList.toggle("active", state.addMode === "task");
  checkinModeButton.classList.toggle("active", state.addMode === "checkin");
  renderHeroModeControls();
  renderDateModeControls();
}

function renderTodayMeta() {
  const date = currentDate();
  const monthDay = new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(date);
  todayMeta.textContent = `${monthDay} ${weekday}・${state.members.length} 人家庭・天氣待開啟`;
}

function renderHeroBanner() {
  heroImage.src = heroImageForNow();
}

function renderHeroModeControls() {
  if (!heroModeText) return;
  const labelMap = {
    auto: "自動 Banner",
    day: "白天 Banner",
    night: "晚上 Banner",
    rain: "雨天 Banner",
  };
  heroModeText.textContent = labelMap[state.heroMode] || "自動 Banner";
  document.querySelectorAll("[data-hero-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.heroMode === state.heroMode);
  });
}

function renderDateModeControls() {
  if (!dateModeText) return;
  dateModeText.textContent = state.dateOffsetDays === 1 ? "模擬明天" : "今天";
  document.querySelectorAll("[data-date-offset]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.dateOffset) === state.dateOffsetDays);
  });
}

function renderFamilySpace() {
  inviteCode.textContent = state.inviteCode;
  inviteStatusText.textContent = `${state.members.length} 人已加入`;
  syncStatusText.textContent = remoteReady ? "Supabase 同步中" : state.backendStatus;
  familyNameText.textContent = state.familyName;
  renderSoundToggle();
}

function renderSoundToggle() {
  if (!soundToggleButton) return;
  soundToggleButton.textContent = soundEnabled ? "提示音已開啟" : "開啟提示音";
  soundToggleButton.classList.toggle("active", soundEnabled);
  if (!pushToggleButton) return;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  pushToggleButton.textContent = supported ? (pushEnabled ? "系統通知已開啟" : "開啟系統通知") : "此裝置不支援系統通知";
  pushToggleButton.classList.toggle("active", pushEnabled);
  pushToggleButton.disabled = !supported;
}

function renderIdentityOptions() {
  if (!identityOptions) return;
  identityOptions.innerHTML = state.members
    .map(
      (member) => `
        <button class="identity-option ${member.name === state.currentUser ? "active" : ""}" type="button" data-identity="${escapeHtml(member.name)}">
          <span class="avatar ${member.tone}">${escapeHtml(member.short)}</span>
          <span>${escapeHtml(member.name)}</span>
        </button>
      `,
    )
    .join("");
}

function renderStatusPicker() {
  statusPicker.innerHTML = statusOptions
    .map(
      (option) => `
        <button class="emoji-button ${option.emoji === state.selectedStatus ? "active" : ""}" type="button" data-status="${option.emoji}" data-status-label="${option.label}">
          <strong>${option.emoji}</strong>
          <small>${escapeHtml(option.label)}</small>
        </button>
      `,
    )
    .join("");
}

function renderTemplates() {
  const markup = templates
    .map(
      (template) => `
        <button class="template-button ${template.title === state.selectedTemplate ? "active" : ""}" type="button" data-template="${escapeHtml(template.title)}">
          <span><img src="${escapeHtml(template.icon)}" alt="" /></span>
          ${escapeHtml(template.title)}
        </button>
      `,
    )
    .join("");
  templatePicker.innerHTML = markup;
}

function renderQuestions() {
  questionPicker.innerHTML = questionTemplates
    .map(
      (question) => `
        <button class="question-button ${question === state.selectedQuestion ? "active" : ""}" type="button" data-question="${escapeHtml(question)}">
          ${escapeHtml(question)}
        </button>
      `,
    )
    .join("");
}

function renderMembers() {
  memberList.innerHTML = state.members.length
    ? state.members
    .map(
      (member) => `
        <article class="member-item">
          <span class="avatar ${member.tone}">${escapeHtml(member.short)}</span>
          <div class="member-main">
            <strong>${escapeHtml(member.name)}</strong>
            <small>${escapeHtml(member.note)}</small>
          </div>
          <span class="member-health">${member.health}</span>
          ${state.role === "admin" && member.name !== state.currentUser ? `<button class="delete-button" type="button" data-delete-member="${escapeHtml(member.name)}">×</button>` : ""}
        </article>
      `,
    )
    .join("")
    : emptyText("還沒有家人加入");

  memberPicker.innerHTML = state.members.length
    ? state.members
    .map(
      (member) => `
        <button class="avatar-button ${member.tone} ${member.name === state.selectedMember ? "active" : ""}" type="button" data-member="${escapeHtml(member.name)}">
          ${escapeHtml(member.short)}
        </button>
      `,
    )
    .join("")
    : emptyText("先加入家人身份");
}

function renderTasks() {
  const today = state.tasks.filter((task) => isTaskDueToday(task));
  const overdue = state.tasks.filter((task) => isTaskOverdue(task));
  const sections = [];
  if (today.length) sections.push(today.map(taskTemplate).join(""));
  if (overdue.length) {
    sections.push(`<div class="task-section-label">逾期未完成</div>${overdue.map(taskTemplate).join("")}`);
  }
  todayTasks.innerHTML = sections.length ? sections.join("") : emptyText("今天沒有任務");
  adminTasks.innerHTML = state.tasks.length ? state.tasks.map(taskTemplate).join("") : emptyText("還沒有任務");
}

function taskTemplate(task) {
  const canCompleteTask = canComplete(task);
  const canDeleteThisTask = canDeleteTask(task);
  const done = isTaskComplete(task);
  return `
    <article class="task-item ${done ? "done" : ""}">
      <button class="check-button ${canCompleteTask ? "" : "locked"}" type="button" ${canCompleteTask ? `data-toggle-task="${task.id}"` : "disabled"} aria-label="${canCompleteTask ? "切換完成" : "只有被指派的人或 Admin 可完成"}">✓</button>
      <div class="task-main">
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.owner)}・${escapeHtml(displayTaskTime(task))}・${escapeHtml(task.author)} 建立</small>
      </div>
      ${canDeleteThisTask ? `<button class="delete-button" type="button" data-delete-task="${task.id}" aria-label="刪除任務">×</button>` : ""}
    </article>
  `;
}

function renderFeed() {
  const markup = state.feed.map(feedTemplate).join("");
  todayFeed.innerHTML = markup;
}

function renderChat() {
  chatList.innerHTML = state.chat.map(chatTemplate).join("");
  chatList.scrollTop = chatList.scrollHeight;
}

function renderCheckin() {
  const pending = state.pendingCheckin;
  checkinCard.style.display = pending ? "grid" : "none";
  if (!pending) return;
  const targetText = pending.target === "all" ? "大家" : pending.target;
  checkinQuestionTitle.textContent = `${pending.from} 問${targetText}`;
  checkinQuestionFrom.textContent = "待回報";
  checkinQuestionText.textContent = pending.question;
}

function feedTemplate(item) {
  return `
    <article class="feed-item ${item.type === "emergency" ? "emergency" : ""}">
      <span class="avatar ${item.tone}">${item.icon}</span>
      <div class="feed-main">
        <strong>${escapeHtml(item.actor)}</strong>
        <small>${escapeHtml(item.text)}</small>
      </div>
      ${canDelete(item.actor) ? `<button class="delete-button" type="button" data-delete-feed="${item.id}">×</button>` : ""}
    </article>
  `;
}

function chatTemplate(item) {
  const member = state.members.find((entry) => entry.name === item.actor) || currentMember();
  const label = item.type === "checkin" ? "狀態詢問" : item.type === "emergency" ? "緊急" : item.type === "system" ? "系統" : "訊息";
  return `
    <article class="chat-message ${item.type === "checkin" || item.type === "system" ? "system" : ""} ${item.type === "emergency" ? "emergency" : ""}">
      <span class="avatar ${member.tone}">${escapeHtml(member.short)}</span>
      <div class="chat-main">
        <small>${escapeHtml(item.actor)}・${label}</small>
        <p>${escapeHtml(item.text)}</p>
      </div>
      ${canDelete(item.actor) ? `<button class="delete-button" type="button" data-delete-chat="${item.id}">×</button>` : ""}
    </article>
  `;
}

function renderRole() {
  applyCurrentRole();
  const isAdmin = state.role === "admin";
  roleToggle.textContent = state.currentUser || "我是誰";
  roleToggle.classList.toggle("member", !isAdmin);
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("admin-disabled", !isAdmin));
}

function applyCurrentRole() {
  const member = state.members.find((item) => item.name === state.currentUser);
  state.role = member?.role === "admin" ? "admin" : "member";
}

function applySavedIdentity() {
  const savedUser = localStorage.getItem(identityStorageKey);
  if (!savedUser) return;
  const member = state.members.find((item) => item.name === savedUser);
  if (!member) return;
  state.currentUser = member.name;
  state.selectedMember = member.name;
  applyCurrentRole();
}

function ensureIdentity() {
  const savedUser = localStorage.getItem(identityStorageKey);
  const hasSavedMember = savedUser && state.members.some((member) => member.name === savedUser);
  if (!hasSavedMember) showIdentityPicker();
}

function showIdentityPicker() {
  renderIdentityOptions();
  identityLayer.classList.add("active");
  identityLayer.setAttribute("aria-hidden", "false");
}

function hideIdentityPicker() {
  identityLayer.classList.remove("active");
  identityLayer.setAttribute("aria-hidden", "true");
}

async function useIdentity(name) {
  const cleanName = name.trim();
  if (!cleanName) return;
  let member = state.members.find((item) => item.name === cleanName);
  if (!member) {
    member = {
      name: cleanName,
      short: cleanName.slice(0, 1),
      tone: "tone-blue",
      health: "😐",
      note: "已加入家庭",
      role: state.members.length ? "member" : "admin",
    };
    state.members.push(member);
    await insertRemoteMember(member);
    addChat(`${cleanName} 已加入家庭`, "system", cleanName);
  }
  state.currentUser = member.name;
  state.selectedMember = member.name;
  localStorage.setItem(identityStorageKey, member.name);
  applyCurrentRole();
  hideIdentityPicker();
  render();
}

function currentMember() {
  return state.members.find((member) => member.name === state.currentUser) || state.members[0] || guestMember;
}

function canDelete(author) {
  return Boolean(state.currentUser) && (state.role === "admin" || author === state.currentUser);
}

function canComplete(task) {
  return Boolean(state.currentUser) && (state.role === "admin" || task.owner === state.currentUser);
}

function canDeleteTask(task) {
  return Boolean(state.currentUser) && (state.role === "admin" || task.author === state.currentUser);
}

function addFeed(text, type = "normal", actor = state.currentUser || "系統") {
  const member = state.members.find((item) => item.name === actor) || currentMember();
  state.feed.unshift({
    id: Date.now() + Math.random(),
    actor,
    icon: member.short,
    tone: member.tone,
    text,
    type,
  });
}

function addChat(text, type = "normal", actor = state.currentUser || "系統") {
  const localMessage = {
    id: `local-${Date.now()}-${Math.random()}`,
    actor,
    text,
    type,
  };
  state.chat.push(localMessage);
  if (remoteReady && familyId) {
    supabaseClient
      .from("messages")
      .insert({ family_id: familyId, actor, text, type })
      .then(({ error }) => {
        if (error) setSyncError("Message sync failed", error);
        else {
          loadRemoteData();
          if (type !== "task") {
            const title = type === "emergency" ? "緊急求助" : "家庭新訊息";
            sendPushNotification({ title, body: `${actor}：${text}`, type });
          }
        }
      });
  }
}

async function addTask(title = state.selectedTemplate, owner = state.selectedMember, time = state.selectedTime) {
  const schedule = scheduleFromTime(time);
  const task = {
    id: `local-${Date.now()}-${Math.random()}`,
    title,
    owner,
    time,
    dueDate: schedule.dueDate,
    repeat: schedule.repeat,
    author: state.currentUser,
    done: false,
  };
  if (remoteReady && familyId) {
    const { data, error } = await supabaseClient
      .from("tasks")
      .insert(toRemoteTask(task))
      .select()
      .single();
    if (error) {
      setSyncError("Task sync failed", error);
      state.tasks.unshift(task);
    } else {
      state.tasks.unshift(fromRemoteTask(data));
      state.backendStatus = "Supabase 已連線";
      await loadRemoteData();
      sendPushNotification({ title: "新增任務", body: `${owner}：${title}`, type: "task" });
    }
  } else {
    state.tasks.unshift(task);
  }
  addFeed(`新增任務：${title} 給 ${owner}`);
  addChat(`新增任務：${title} 給 ${owner}，時間：${time}`, "task");
  markSynced();
}

function markSynced() {
  state.backendStatus = "剛剛同步";
}

function setSyncError(label, error) {
  const detail = error?.message || label;
  state.backendStatus = `同步失敗：${detail}`;
  console.warn(label, error);
}

function initSoundSetting() {
  soundEnabled = localStorage.getItem(soundStorageKey) === "true";
  pushEnabled = localStorage.getItem(pushStorageKey) === "true" && Notification?.permission === "granted";
}

async function enableSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(soundStorageKey, String(soundEnabled));
  if (soundEnabled) {
    await ensureAudioContext();
    playTone("message");
  }
  renderSoundToggle();
}

async function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === "suspended") await audioContext.resume();
  return audioContext;
}

function playTone(kind) {
  if (!soundEnabled) return;
  ensureAudioContext().then((context) => {
    if (!context) return;
    const now = context.currentTime;
    const tones =
      kind === "emergency"
        ? [
            [740, 0, 0.18],
            [980, 0.2, 0.24],
            [740, 0.46, 0.18],
          ]
        : [[660, 0, 0.12]];
    tones.forEach(([frequency, delay, duration]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "emergency" ? "square" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(kind === "emergency" ? 0.08 : 0.045, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration + 0.02);
    });
  });
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    state.backendStatus = "此裝置不支援系統通知";
    render();
    return;
  }
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    state.backendStatus = "系統通知未允許";
    render();
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  if (remoteReady && familyId) {
    const { error } = await supabaseClient.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        family_id: familyId,
        member_name: state.currentUser,
        subscription: subscription.toJSON(),
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      setSyncError("Push subscription sync failed", error);
      render();
      return;
    }
  }
  pushEnabled = true;
  localStorage.setItem(pushStorageKey, "true");
  state.backendStatus = "系統通知已開啟";
  render();
}

async function sendPushNotification(payload) {
  if (!remoteReady || !familyId) return;
  const { error } = await supabaseClient.functions.invoke("super-function", {
    body: {
      familyId,
      excludeMember: state.currentUser,
      ...payload,
    },
  });
  if (error) console.warn("Push send failed", error);
}

function notifyRemoteChanges(messages, tasks) {
  const newestMessage = messages.at(-1);
  const newestTask = tasks[0];
  if (!hasLoadedRemoteOnce) {
    lastSeenMessageId = newestMessage?.id || null;
    lastSeenTaskId = newestTask?.id || null;
    hasLoadedRemoteOnce = true;
    return;
  }
  if (newestMessage && newestMessage.id !== lastSeenMessageId && newestMessage.actor !== state.currentUser) {
    playTone(newestMessage.type === "emergency" ? "emergency" : "message");
  }
  if (newestTask && newestTask.id !== lastSeenTaskId && newestTask.author !== state.currentUser) {
    playTone("task");
  }
  lastSeenMessageId = newestMessage?.id || lastSeenMessageId;
  lastSeenTaskId = newestTask?.id || lastSeenTaskId;
}

function sameId(a, b) {
  return String(a) === String(b);
}

function fromRemoteMember(member) {
  return {
    id: member.id,
    name: member.name,
    short: member.short,
    tone: member.role === "admin" ? "tone-gold" : "tone-teal",
    health: member.health || "😐",
    note: member.note || "已加入家庭",
    role: member.role || "member",
  };
}

function fromRemoteTask(task) {
  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    author: task.author,
    time: task.time_label,
    dueDate: task.due_date,
    repeat: task.repeat || (task.time_label === "每天" ? "daily" : null),
    done: task.done,
    lastCompletedDate: task.last_completed_date,
  };
}

function toRemoteTask(task) {
  return {
    family_id: familyId,
    title: task.title,
    owner: task.owner,
    author: task.author,
    time_label: task.time,
    due_date: task.dueDate,
    done: task.done,
  };
}

function fromRemoteMessage(message) {
  return {
    id: message.id,
    actor: message.actor,
    text: message.text,
    type: message.type || "normal",
  };
}

function messageToFeed(message) {
  const member = state.members.find((item) => item.name === message.actor) || currentMember();
  return {
    id: message.id,
    actor: message.actor,
    icon: member.short,
    tone: member.tone,
    text: message.text,
    type: message.type === "emergency" ? "emergency" : "normal",
  };
}

async function initRemote() {
  if (!supabaseClient) {
    state.backendStatus = "本機模式";
    applySavedIdentity();
    ensureIdentity();
    return;
  }
  try {
    let { data: family, error: familyError } = await supabaseClient
      .from("families")
      .select("*")
      .eq("invite_code", state.inviteCode)
      .maybeSingle();
    if (familyError) throw familyError;
    if (!family) {
      const created = await supabaseClient
        .from("families")
        .insert({ name: state.familyName, invite_code: state.inviteCode })
        .select()
        .single();
      if (created.error) throw created.error;
      family = created.data;
    }
    familyId = family.id;
    state.familyName = family.name;
    remoteReady = true;
    await loadRemoteData();
    subscribeRemote();
    startAutoSync();
  } catch (error) {
    setSyncError("Supabase init failed", error);
    applySavedIdentity();
    ensureIdentity();
  }
}

async function loadRemoteData(shouldRender = true) {
  if (!remoteReady || !familyId) return;
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const [{ data: members, error: membersError }, { data: tasks, error: tasksError }, { data: messages, error: messagesError }] =
      await Promise.all([
        supabaseClient.from("members").select("*").eq("family_id", familyId).order("created_at"),
        supabaseClient.from("tasks").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
        supabaseClient.from("messages").select("*").eq("family_id", familyId).order("created_at", { ascending: true }),
      ]);

    if (membersError || tasksError || messagesError) {
      setSyncError("Remote load failed", membersError || tasksError || messagesError);
      if (shouldRender) render();
      return;
    }

    if (shouldClearDemoData(members, tasks, messages)) {
      await clearRemoteDemoData();
      localStorage.setItem(demoCleanupKey, "true");
      state.members = [];
      state.tasks = [];
      state.chat = [];
      state.feed = [];
      if (shouldRender) render();
      return;
    }

    state.members = members.map(fromRemoteMember);
    state.tasks = tasks.map(fromRemoteTask);
    state.chat = messages.map(fromRemoteMessage);
    state.feed = messages.slice(-6).reverse().map(messageToFeed);
    state.backendStatus = "Supabase 已連線";
    applySavedIdentity();
    notifyRemoteChanges(messages, tasks);
    ensureIdentity();
    if (shouldRender) render();
  } finally {
    syncInFlight = false;
  }
}

function shouldClearDemoData(members, tasks, messages) {
  if (localStorage.getItem(demoCleanupKey) === "true") return false;
  if (!members.length) return false;
  const onlyDemoMembers = members.every((member) => demoMemberNames.includes(member.name));
  const onlyDemoTasks = tasks.every((task) => demoMemberNames.includes(task.owner) || demoMemberNames.includes(task.author));
  const onlyDemoMessages = messages.every((message) => demoMemberNames.includes(message.actor) || message.actor === "系統");
  return onlyDemoMembers && onlyDemoTasks && onlyDemoMessages;
}

async function clearRemoteDemoData() {
  if (!remoteReady || !familyId) return;
  const [{ error: taskError }, { error: messageError }, { error: memberError }] = await Promise.all([
    supabaseClient.from("tasks").delete().eq("family_id", familyId),
    supabaseClient.from("messages").delete().eq("family_id", familyId),
    supabaseClient.from("members").delete().eq("family_id", familyId),
  ]);
  if (taskError || messageError || memberError) setSyncError("Demo clear failed", taskError || messageError || memberError);
}

function subscribeRemote() {
  if (!remoteReady || realtimeChannel) return;
  realtimeChannel = supabaseClient
    .channel("family-workspace")
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => loadRemoteData())
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadRemoteData())
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadRemoteData())
    .subscribe();
}

function startAutoSync() {
  if (syncTimer) return;
  syncTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") loadRemoteData();
  }, 3000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadRemoteData();
});

window.addEventListener("focus", () => loadRemoteData());

async function seedRemoteMembers() {
  if (!remoteReady || !familyId) return;
  const seedMembers = initialState.members.map((member) => ({
    family_id: familyId,
    name: member.name,
    short: member.short,
    role: member.name === state.currentUser ? "admin" : "member",
    health: member.health,
    note: member.note,
  }));
  if (!seedMembers.length) return;
  const { error } = await supabaseClient.from("members").insert(seedMembers);
  if (error) setSyncError("Member seed failed", error);
}

async function refreshRemoteSoon() {
  if (!remoteReady || !familyId) return;
  await loadRemoteData(false);
}

async function updateRemoteTask(task) {
  if (!remoteReady || !familyId || String(task.id).startsWith("local-")) return;
  const { error } = await supabaseClient
    .from("tasks")
    .update({
      title: task.title,
      owner: task.owner,
      author: task.author,
      time_label: task.time,
      due_date: task.dueDate,
      done: task.done,
    })
    .eq("id", task.id);
  if (error) setSyncError("Task update sync failed", error);
  else await loadRemoteData(false);
}

async function updateRemoteMember(member) {
  if (!remoteReady || !familyId) return;
  const query = supabaseClient
    .from("members")
    .update({
      health: member.health,
      note: member.note,
      short: member.short,
      role: member.role || (member.name === state.currentUser ? "admin" : "member"),
    })
    .eq("family_id", familyId)
    .eq("name", member.name);
  const { error } = await query;
  if (error) setSyncError("Member update sync failed", error);
  else await loadRemoteData(false);
}

async function insertRemoteMember(member) {
  if (!remoteReady || !familyId) return;
  const { error } = await supabaseClient.from("members").insert({
    family_id: familyId,
    name: member.name,
    short: member.short,
    role: member.role || "member",
    health: member.health,
    note: member.note,
  });
  if (error) setSyncError("Member insert sync failed", error);
  else await loadRemoteData(false);
}

async function deleteRemoteMessage(id) {
  if (!remoteReady || !familyId || String(id).startsWith("local-")) return;
  const { error } = await supabaseClient.from("messages").delete().eq("id", id);
  if (error) setSyncError("Message delete sync failed", error);
  else await loadRemoteData(false);
}

async function clearRemoteExamples() {
  if (!remoteReady || !familyId) return;
  const [{ error: taskError }, { error: messageError }] = await Promise.all([
    supabaseClient.from("tasks").delete().eq("family_id", familyId),
    supabaseClient.from("messages").delete().eq("family_id", familyId),
  ]);
  if (taskError || messageError) setSyncError("Remote clear failed", taskError || messageError);
  await Promise.all(state.members.map(updateRemoteMember));
}

async function resetRemoteDemo() {
  if (!remoteReady || !familyId) return;
  const [{ error: taskError }, { error: messageError }, { error: memberError }] = await Promise.all([
    supabaseClient.from("tasks").delete().eq("family_id", familyId),
    supabaseClient.from("messages").delete().eq("family_id", familyId),
    supabaseClient.from("members").delete().eq("family_id", familyId),
  ]);
  if (taskError || messageError || memberError) setSyncError("Remote reset failed", taskError || messageError || memberError);
  await seedRemoteMembers();
  await loadRemoteData(false);
}

function todayISO() {
  return localISODate(currentDate());
}

function currentDate() {
  return addDays(new Date(), state.dateOffsetDays || 0);
}

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function scheduleFromTime(time) {
  if (time === "每天") return { dueDate: todayISO(), repeat: "daily" };
  if (time === "明天") return { dueDate: localISODate(addDays(currentDate(), 1)), repeat: null };
  if (time === "週末") return { dueDate: nextWeekendISO(), repeat: null };
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(time)) return { dueDate: time.replaceAll("/", "-"), repeat: null };
  return { dueDate: todayISO(), repeat: null };
}

function nextWeekendISO() {
  const date = currentDate();
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  return localISODate(addDays(date, daysUntilSaturday));
}

function taskDueDate(task) {
  return task.dueDate || scheduleFromTime(task.time).dueDate;
}

function isTaskComplete(task) {
  if (task.repeat === "daily" || task.time === "每天") {
    return task.lastCompletedDate === todayISO();
  }
  return task.done;
}

function isTaskDueToday(task) {
  if (task.repeat === "daily" || task.time === "每天") return true;
  return taskDueDate(task) === todayISO();
}

function isTaskOverdue(task) {
  if (task.repeat === "daily" || task.time === "每天") return false;
  return !isTaskComplete(task) && taskDueDate(task) < todayISO();
}

function displayTaskTime(task) {
  if (task.repeat === "daily" || task.time === "每天") return "每天";
  const dueDate = taskDueDate(task);
  if (dueDate === todayISO()) return "今天";
  if (dueDate === localISODate(addDays(currentDate(), 1))) return "明天";
  return dueDate.replaceAll("-", "/");
}

function heroImageForNow() {
  if (state.heroMode === "day") return "assets/icons/Hero Banner/白天.png";
  if (state.heroMode === "night") return "assets/icons/Hero Banner/晚上.png";
  if (state.heroMode === "rain") return "assets/icons/Hero Banner/雨天.png";
  if (state.weatherMode === "rain") return "assets/icons/Hero Banner/雨天.png";
  const hour = currentDate().getHours();
  if (hour >= 18 || hour < 6) return "assets/icons/Hero Banner/晚上.png";
  return "assets/icons/Hero Banner/白天.png";
}

function inviteUrl() {
  const basePath = location.href.split("#")[0];
  return `${basePath}#join=${state.inviteCode}`;
}

function addInvitedMember() {
  const invitedNames = ["小姑", "弟弟", "室友", "阿姨"];
  const nextName = invitedNames.find((name) => !state.members.some((member) => member.name === name)) || `家人${state.members.length + 1}`;
  const member = {
    name: nextName,
    short: nextName.slice(0, 1),
    tone: "tone-blue",
    health: "😐",
    note: "剛用邀請連結加入",
  };
  state.members.push(member);
  if (remoteReady && familyId) {
    supabaseClient
      .from("members")
      .insert({
        family_id: familyId,
        name: member.name,
        short: member.short,
        role: "member",
        health: member.health,
        note: member.note,
      })
      .then(({ error }) => {
        if (error) console.warn("Member sync failed", error);
      });
  }
  addFeed(`${nextName} 已加入 ${state.familyName}`);
  addChat(`${nextName} 已透過邀請連結加入家庭`, "system", "系統");
  markSynced();
}

function clearExamples() {
  state.pendingCheckin = null;
  state.tasks = [];
  state.feed = [];
  state.chat = [];
  state.backendStatus = "已初始化";
  state.members = state.members.map((member) => ({
    ...member,
    health: "😐",
    note: member.name === state.currentUser ? "家庭擁有者" : "已加入家庭",
  }));
}

function openDeleteTaskConfirm(task) {
  pendingDeleteTaskId = task.id;
  const isAdminDeletingOther = state.role === "admin" && task.author !== state.currentUser;
  deleteTaskTitle.textContent = `確定刪除「${task.title}」？`;
  deleteTaskMessage.textContent = isAdminDeletingOther
    ? `你正在以 Admin 身分刪除 ${task.author} 建立的任務。`
    : "刪除後會從今天任務和管理頁移除。";
  deleteTaskConfirm.classList.add("active");
  deleteTaskConfirm.setAttribute("aria-hidden", "false");
}

function closeDeleteTaskConfirm() {
  pendingDeleteTaskId = null;
  deleteTaskConfirm.classList.remove("active");
  deleteTaskConfirm.setAttribute("aria-hidden", "true");
}

function deletePendingTask() {
  const task = state.tasks.find((item) => sameId(item.id, pendingDeleteTaskId));
  if (!task || !canDeleteTask(task)) {
    closeDeleteTaskConfirm();
    return;
  }
  state.tasks = state.tasks.filter((item) => !sameId(item.id, task.id));
  if (remoteReady && familyId && !String(task.id).startsWith("local-")) {
    supabaseClient
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .then(({ error }) => {
        if (error) console.warn("Task delete sync failed", error);
      });
  }
  addFeed(`刪除任務：${task.title}`);
  markSynced();
  closeDeleteTaskConfirm();
  render();
}

function currentTaskTitle() {
  return customTaskInput.value.trim() || state.selectedTemplate;
}

function currentQuestion() {
  return customQuestionInput.value.trim() || state.selectedQuestion;
}

function emptyText(text) {
  return `<p class="empty-text">${text}</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.body.addEventListener("click", async (event) => {
  const screenButton = event.target.closest("[data-screen]");
  if (screenButton) switchScreen(screenButton.dataset.screen);

  const screenLink = event.target.closest("[data-screen-link]");
  if (screenLink) switchScreen(screenLink.dataset.screenLink);

  const startAction = event.target.closest("[data-start-action]");
  if (startAction) {
    state.addMode = startAction.dataset.startAction === "checkin" ? "checkin" : "task";
    if (state.addMode === "task" && state.selectedMember === "all") state.selectedMember = state.currentUser;
    render();
    switchScreen("add");
  }

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    state.selectedStatus = statusButton.dataset.status;
    render();
  }

  const templateButton = event.target.closest("[data-template]");
  if (templateButton) {
    state.selectedTemplate = templateButton.dataset.template;
    if (customTaskInput) customTaskInput.value = state.selectedTemplate;
    if (state.addMode !== "task") state.addMode = "task";
    render();
  }

  const questionButton = event.target.closest("[data-question]");
  if (questionButton) {
    state.selectedQuestion = questionButton.dataset.question;
    customQuestionInput.value = state.selectedQuestion;
    render();
  }

  const memberButton = event.target.closest("[data-member]");
  if (memberButton) {
    state.selectedMember = memberButton.dataset.member;
    render();
  }

  const timeButton = event.target.closest("[data-time]");
  if (timeButton) {
    state.selectedTime = timeButton.dataset.time;
    document.querySelectorAll("[data-time]").forEach((button) => button.classList.toggle("active", button === timeButton));
    datePickerRow.classList.remove("active");
    customDateInput.value = "";
    selectedTimeText.textContent = state.selectedTime;
  }

  const heroModeButton = event.target.closest("[data-hero-mode]");
  if (heroModeButton) {
    state.heroMode = heroModeButton.dataset.heroMode;
    render();
  }

  const dateModeButton = event.target.closest("[data-date-offset]");
  if (dateModeButton) {
    state.dateOffsetDays = Number(dateModeButton.dataset.dateOffset);
    render();
  }

  const toggleTaskButton = event.target.closest("[data-toggle-task]");
  if (toggleTaskButton) {
    const task = state.tasks.find((item) => sameId(item.id, toggleTaskButton.dataset.toggleTask));
    if (task) {
      if (task.repeat === "daily" || task.time === "每天") {
        task.lastCompletedDate = task.lastCompletedDate === todayISO() ? null : todayISO();
      } else {
        task.done = !task.done;
      }
      const completed = isTaskComplete(task);
      await updateRemoteTask(task);
      addFeed(`${completed ? "完成" : "取消完成"}：${task.title}`);
      addChat(`${completed ? "完成" : "取消完成"}：${task.title}`, "task");
      render();
    }
  }

  const deleteTaskButton = event.target.closest("[data-delete-task]");
  if (deleteTaskButton) {
    const id = deleteTaskButton.dataset.deleteTask;
    const task = state.tasks.find((item) => sameId(item.id, id));
    if (task && canDeleteTask(task)) {
      openDeleteTaskConfirm(task);
    }
  }

  const deleteFeedButton = event.target.closest("[data-delete-feed]");
  if (deleteFeedButton) {
    const id = deleteFeedButton.dataset.deleteFeed;
    const item = state.feed.find((feed) => sameId(feed.id, id));
    if (item && canDelete(item.actor)) {
      state.feed = state.feed.filter((feed) => !sameId(feed.id, id));
      await deleteRemoteMessage(id);
      render();
    }
  }

  const deleteChatButton = event.target.closest("[data-delete-chat]");
  if (deleteChatButton) {
    const id = deleteChatButton.dataset.deleteChat;
    const item = state.chat.find((chat) => sameId(chat.id, id));
    if (item && canDelete(item.actor)) {
      state.chat = state.chat.filter((chat) => !sameId(chat.id, id));
      await deleteRemoteMessage(id);
      render();
    }
  }

  const deleteMemberButton = event.target.closest("[data-delete-member]");
  if (deleteMemberButton && state.role === "admin") {
    const name = deleteMemberButton.dataset.deleteMember;
    if (name !== state.currentUser) {
      state.members = state.members.filter((member) => member.name !== name);
      state.tasks = state.tasks.filter((task) => task.owner !== name);
      if (remoteReady && familyId) {
        await Promise.all([
          supabaseClient.from("members").delete().eq("family_id", familyId).eq("name", name),
          supabaseClient.from("tasks").delete().eq("family_id", familyId).eq("owner", name),
        ]);
      }
      addFeed(`移除成員：${name}`);
      markSynced();
      render();
    }
  }
});

createTaskButton.addEventListener("click", async () => {
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  if (state.addMode === "task") {
    if (state.selectedMember === "all" || !state.selectedMember) state.selectedMember = state.currentUser;
    await addTask(currentTaskTitle(), state.selectedMember, state.selectedTime);
    customTaskInput.value = "";
  } else {
    const target = state.selectedMember;
    const question = currentQuestion();
    state.pendingCheckin = {
      from: state.currentUser,
      target,
      question,
    };
    addFeed(`詢問 ${target === "all" ? "大家" : target}：${question}`);
    addChat(`問 ${target === "all" ? "大家" : target}：${question}`, "checkin");
    markSynced();
    customQuestionInput.value = "";
  }
  render();
  switchScreen("today");
});

document.querySelector("#sosOpenButton").addEventListener("click", () => {
  sosConfirm.classList.add("active");
  sosConfirm.setAttribute("aria-hidden", "false");
});

document.querySelector("#sosCancelButton").addEventListener("click", () => {
  sosConfirm.classList.remove("active");
  sosConfirm.setAttribute("aria-hidden", "true");
});

document.querySelector("#deleteTaskCancelButton").addEventListener("click", closeDeleteTaskConfirm);

document.querySelector("#deleteTaskConfirmButton").addEventListener("click", deletePendingTask);

document.querySelector("#sosSendButton").addEventListener("click", async () => {
  sosConfirm.classList.remove("active");
  sosConfirm.setAttribute("aria-hidden", "true");
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  const member = currentMember();
  member.health = "🚨";
  member.note = "剛剛按下緊急求助";
  await updateRemoteMember(member);
  addFeed("按下緊急求助，已通知全部家人", "emergency");
  addChat("🚨 緊急求助：請家人立刻確認。", "emergency");
  markSynced();
  render();
  switchScreen("chat");
});

roleToggle.addEventListener("click", showIdentityPicker);

soundToggleButton.addEventListener("click", enableSound);

pushToggleButton.addEventListener("click", enablePushNotifications);

identityOptions.addEventListener("click", async (event) => {
  const identityButton = event.target.closest("[data-identity]");
  if (!identityButton) return;
  await useIdentity(identityButton.dataset.identity);
});

identityJoinButton.addEventListener("click", async () => {
  await useIdentity(identityNameInput.value);
  identityNameInput.value = "";
});

identityNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") identityJoinButton.click();
});

taskModeButton.addEventListener("click", () => {
  state.addMode = "task";
  if (state.selectedMember === "all") state.selectedMember = state.currentUser;
  render();
});

checkinModeButton.addEventListener("click", () => {
  state.addMode = "checkin";
  render();
});

selectAllButton.addEventListener("click", () => {
  state.selectedMember = "all";
  render();
});

chooseDateButton.addEventListener("click", () => {
  customDateInput.showPicker?.();
  customDateInput.focus();
});

customDateInput.addEventListener("change", () => {
  if (!customDateInput.value) return;
  const selectedDate = new Date(`${customDateInput.value}T00:00:00`);
  state.selectedTime = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(selectedDate);
  document.querySelectorAll("[data-time]").forEach((button) => button.classList.remove("active"));
  datePickerRow.classList.add("active");
  render();
});

document.querySelector("#shareButton").addEventListener("click", () => {
  chatInput.focus();
});

document.querySelector("#sendChatButton").addEventListener("click", () => {
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  const text = chatInput.value.trim();
  if (!text) return;
  addFeed(`分享：${text}`);
  addChat(text);
  markSynced();
  chatInput.value = "";
  render();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.querySelector("#sendChatButton").click();
  }
});

document.querySelector("#sendStatusButton").addEventListener("click", async () => {
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  const label = statusOptions.find((option) => option.emoji === state.selectedStatus)?.label || "已回報";
  const note = statusNoteInput.value.trim();
  const member = currentMember();
  member.health = state.selectedStatus;
  member.note = note || `剛剛回報 ${label}`;
  await updateRemoteMember(member);
  const message = `回報狀態 ${state.selectedStatus} ${label}${note ? `：${note}` : ""}`;
  addFeed(message);
  addChat(message, "checkin");
  state.pendingCheckin = null;
  statusNoteInput.value = "";
  markSynced();
  render();
});

document.querySelector("#addMemberButton").addEventListener("click", async () => {
  if (state.role !== "admin") return;
  const index = state.members.length + 1;
  const name = `家人${index}`;
  const member = {
    name,
    short: String(index),
    tone: "tone-blue",
    health: "😐",
    note: "新加入",
    role: "member",
  };
  state.members.push(member);
  await insertRemoteMember(member);
  addFeed(`新增成員：${name}`);
  markSynced();
  render();
});

document.querySelector("#copyInviteButton").addEventListener("click", async () => {
  const text = inviteUrl();
  try {
    await navigator.clipboard.writeText(text);
    inviteStatusText.textContent = "連結已複製";
  } catch {
    inviteStatusText.textContent = "邀請碼可分享";
  }
});

document.querySelector("#simulateJoinButton").addEventListener("click", async () => {
  addInvitedMember();
  await refreshRemoteSoon();
  render();
});

document.querySelector("#resetDemoButton").addEventListener("click", async () => {
  state = structuredClone(initialState);
  await resetRemoteDemo();
  render();
  switchScreen("today");
});

document.querySelector("#clearDemoButton").addEventListener("click", async () => {
  clearExamples();
  await clearRemoteExamples();
  render();
  switchScreen("today");
});

document.querySelector("#addDemoTaskButton").addEventListener("click", async () => {
  const random = templates[Math.floor(Math.random() * templates.length)];
  await addTask(random.title, state.members[Math.floor(Math.random() * state.members.length)].name, "今天");
  render();
});

initSoundSetting();
applySavedIdentity();
render();
initRemote().then(() => render());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
