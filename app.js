const initialState = {
  familyName: "Sam 的家",
  inviteCode: "FAM-8392",
  backendStatus: "已同步",
  currentUser: "Sam",
  role: "admin",
  selectedTemplate: "買菜",
  selectedMember: "Sam",
  selectedTime: "今天",
  addMode: "task",
  selectedQuestion: "今天狀況如何？",
  selectedStatus: "😄",
  pendingCheckin: {
    from: "爸爸",
    target: "Sam",
    question: "今天狀況如何？",
  },
  members: [
    { name: "Sam", short: "你", tone: "tone-gold", health: "😄", note: "今天值班" },
    { name: "爸爸", short: "爸", tone: "tone-red", health: "😐", note: "09:18 已確認" },
    { name: "姐姐", short: "姐", tone: "tone-teal", health: "😄", note: "負責晚餐與藥盒" },
    { name: "媽媽", short: "媽", tone: "tone-blue", health: "😴", note: "晚上回報" },
    { name: "哥哥", short: "哥", tone: "tone-teal", health: "😐", note: "尚未確認" },
  ],
  tasks: [
    { id: 1, title: "買菜", owner: "姐姐", time: "今天", author: "Sam", done: false },
    { id: 2, title: "回家", owner: "Sam", time: "今天", author: "Sam", done: false },
    { id: 3, title: "晚餐後量血壓", owner: "爸爸", time: "今天", author: "姐姐", done: false },
    { id: 4, title: "確認媽媽新藥", owner: "哥哥", time: "今天", author: "爸爸", done: false },
  ],
  feed: [
    { id: 1, actor: "Sam", icon: "你", tone: "tone-gold", text: "回報狀態 😄 OK", type: "normal" },
    { id: 2, actor: "爸爸", icon: "爸", tone: "tone-red", text: "新增任務：確認媽媽新藥", type: "normal" },
    { id: 3, actor: "姐姐", icon: "姐", tone: "tone-teal", text: "完成：補藥盒", type: "normal" },
  ],
  chat: [
    { id: 1, actor: "爸爸", text: "大家今天狀況如何？Sam 先回報一下。", type: "checkin" },
    { id: 2, actor: "姐姐", text: "我晚上會去買菜，順便拿包裹。", type: "normal" },
    { id: 3, actor: "Sam", text: "收到，我回家後處理垃圾。", type: "normal" },
  ],
};

let state = structuredClone(initialState);

const statusOptions = [
  { emoji: "😄", label: "OK" },
  { emoji: "😐", label: "普通" },
  { emoji: "😷", label: "不舒服" },
  { emoji: "😴", label: "累" },
  { emoji: "🚨", label: "幫忙" },
];

const templates = [
  { icon: "🛒", title: "買菜" },
  { icon: "🗑", title: "倒垃圾" },
  { icon: "💊", title: "吃藥" },
  { icon: "🩺", title: "量血壓" },
  { icon: "🚗", title: "接送" },
  { icon: "💳", title: "繳費" },
  { icon: "📦", title: "拿包裹" },
  { icon: "📞", title: "打電話" },
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
const quickTemplates = document.querySelector("#quickTemplates");
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
const inviteCode = document.querySelector("#inviteCode");
const inviteStatusText = document.querySelector("#inviteStatusText");
const syncStatusText = document.querySelector("#syncStatusText");
const familyNameText = document.querySelector("#familyNameText");

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
  selectedTemplateText.textContent = state.selectedTemplate;
  selectedQuestionText.textContent = state.selectedQuestion;
  selectedMemberText.textContent = state.selectedMember === "all" ? "大家" : state.selectedMember;
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
}

function renderFamilySpace() {
  inviteCode.textContent = state.inviteCode;
  inviteStatusText.textContent = `${state.members.length} 人已加入`;
  syncStatusText.textContent = state.backendStatus;
  familyNameText.textContent = state.familyName;
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
          <span>${template.icon}</span>
          ${escapeHtml(template.title)}
        </button>
      `,
    )
    .join("");
  quickTemplates.innerHTML = markup;
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
  memberList.innerHTML = state.members
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
    .join("");

  memberPicker.innerHTML = state.members
    .map(
      (member) => `
        <button class="avatar-button ${member.tone} ${member.name === state.selectedMember ? "active" : ""}" type="button" data-member="${escapeHtml(member.name)}">
          ${escapeHtml(member.short)}
        </button>
      `,
    )
    .join("");
}

function renderTasks() {
  const today = state.tasks.filter((task) => task.time === "今天" || task.time === "每天");
  todayTasks.innerHTML = today.length ? today.map(taskTemplate).join("") : emptyText("今天沒有任務");
  adminTasks.innerHTML = state.tasks.length ? state.tasks.map(taskTemplate).join("") : emptyText("還沒有任務");
}

function taskTemplate(task) {
  const canCompleteTask = canComplete(task);
  return `
    <article class="task-item ${task.done ? "done" : ""}">
      <button class="check-button ${canCompleteTask ? "" : "locked"}" type="button" ${canCompleteTask ? `data-toggle-task="${task.id}"` : "disabled"} aria-label="${canCompleteTask ? "切換完成" : "只有被指派的人或 Admin 可完成"}">✓</button>
      <div class="task-main">
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.owner)}・${escapeHtml(task.time)}・${escapeHtml(task.author)} 建立</small>
      </div>
      ${canDelete(task.author) ? `<button class="delete-button" type="button" data-delete-task="${task.id}">×</button>` : ""}
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
  const isAdmin = state.role === "admin";
  roleToggle.textContent = isAdmin ? "Admin" : "成員";
  roleToggle.classList.toggle("member", !isAdmin);
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("admin-disabled", !isAdmin));
}

function currentMember() {
  return state.members.find((member) => member.name === state.currentUser) || state.members[0];
}

function canDelete(author) {
  return state.role === "admin" || author === state.currentUser;
}

function canComplete(task) {
  return state.role === "admin" || task.owner === state.currentUser;
}

function addFeed(text, type = "normal", actor = state.currentUser) {
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

function addChat(text, type = "normal", actor = state.currentUser) {
  state.chat.push({
    id: Date.now() + Math.random(),
    actor,
    text,
    type,
  });
}

function addTask(title = state.selectedTemplate, owner = state.selectedMember, time = state.selectedTime) {
  state.tasks.unshift({
    id: Date.now() + Math.random(),
    title,
    owner,
    time,
    author: state.currentUser,
    done: false,
  });
  addFeed(`新增任務：${title} 給 ${owner}`);
  addChat(`新增任務：${title} 給 ${owner}，時間：${time}`, "task");
  markSynced();
}

function markSynced() {
  state.backendStatus = "剛剛同步";
}

function inviteUrl() {
  const basePath = location.href.split("#")[0];
  return `${basePath}#join=${state.inviteCode}`;
}

function addInvitedMember() {
  const invitedNames = ["小姑", "弟弟", "室友", "阿姨"];
  const nextName = invitedNames.find((name) => !state.members.some((member) => member.name === name)) || `家人${state.members.length + 1}`;
  state.members.push({
    name: nextName,
    short: nextName.slice(0, 1),
    tone: "tone-blue",
    health: "😐",
    note: "剛用邀請連結加入",
  });
  addFeed(`${nextName} 已加入 ${state.familyName}`);
  addChat(`${nextName} 已透過邀請連結加入家庭`, "system", "Sam");
  markSynced();
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

document.body.addEventListener("click", (event) => {
  const screenButton = event.target.closest("[data-screen]");
  if (screenButton) switchScreen(screenButton.dataset.screen);

  const screenLink = event.target.closest("[data-screen-link]");
  if (screenLink) switchScreen(screenLink.dataset.screenLink);

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
    if (event.target.closest("#quickTemplates")) switchScreen("add");
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
    selectedTimeText.textContent = state.selectedTime;
  }

  const toggleTaskButton = event.target.closest("[data-toggle-task]");
  if (toggleTaskButton) {
    const task = state.tasks.find((item) => item.id === Number(toggleTaskButton.dataset.toggleTask));
    if (task) {
      task.done = !task.done;
      addFeed(`${task.done ? "完成" : "取消完成"}：${task.title}`);
      addChat(`${task.done ? "完成" : "取消完成"}：${task.title}`, "task");
      render();
    }
  }

  const deleteTaskButton = event.target.closest("[data-delete-task]");
  if (deleteTaskButton) {
    const id = Number(deleteTaskButton.dataset.deleteTask);
    const task = state.tasks.find((item) => item.id === id);
    if (task && canDelete(task.author)) {
      state.tasks = state.tasks.filter((item) => item.id !== id);
      addFeed(`刪除任務：${task.title}`);
      markSynced();
      render();
    }
  }

  const deleteFeedButton = event.target.closest("[data-delete-feed]");
  if (deleteFeedButton) {
    const id = Number(deleteFeedButton.dataset.deleteFeed);
    const item = state.feed.find((feed) => feed.id === id);
    if (item && canDelete(item.actor)) {
      state.feed = state.feed.filter((feed) => feed.id !== id);
      render();
    }
  }

  const deleteChatButton = event.target.closest("[data-delete-chat]");
  if (deleteChatButton) {
    const id = Number(deleteChatButton.dataset.deleteChat);
    const item = state.chat.find((chat) => chat.id === id);
    if (item && canDelete(item.actor)) {
      state.chat = state.chat.filter((chat) => chat.id !== id);
      render();
    }
  }

  const deleteMemberButton = event.target.closest("[data-delete-member]");
  if (deleteMemberButton && state.role === "admin") {
    const name = deleteMemberButton.dataset.deleteMember;
    if (name !== state.currentUser) {
      state.members = state.members.filter((member) => member.name !== name);
      state.tasks = state.tasks.filter((task) => task.owner !== name);
      addFeed(`移除成員：${name}`);
      markSynced();
      render();
    }
  }
});

createTaskButton.addEventListener("click", () => {
  if (state.addMode === "task") {
    if (state.selectedMember === "all") state.selectedMember = state.currentUser;
    addTask(currentTaskTitle(), state.selectedMember, state.selectedTime);
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

document.querySelector("#sosSendButton").addEventListener("click", () => {
  sosConfirm.classList.remove("active");
  sosConfirm.setAttribute("aria-hidden", "true");
  currentMember().health = "🚨";
  currentMember().note = "剛剛按下緊急求助";
  addFeed("按下緊急求助，已通知全部家人", "emergency");
  addChat("🚨 緊急求助：請家人立刻確認。", "emergency");
  markSynced();
  render();
  switchScreen("chat");
});

roleToggle.addEventListener("click", () => {
  state.role = state.role === "admin" ? "member" : "admin";
  render();
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

document.querySelector("#shareButton").addEventListener("click", () => {
  chatInput.focus();
});

document.querySelector("#sendChatButton").addEventListener("click", () => {
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

document.querySelector("#sendStatusButton").addEventListener("click", () => {
  const label = statusOptions.find((option) => option.emoji === state.selectedStatus)?.label || "已回報";
  const note = statusNoteInput.value.trim();
  currentMember().health = state.selectedStatus;
  currentMember().note = note || `剛剛回報 ${label}`;
  const message = `回報狀態 ${state.selectedStatus} ${label}${note ? `：${note}` : ""}`;
  addFeed(message);
  addChat(message, "checkin");
  state.pendingCheckin = null;
  statusNoteInput.value = "";
  markSynced();
  render();
});

document.querySelector("#addMemberButton").addEventListener("click", () => {
  if (state.role !== "admin") return;
  const index = state.members.length + 1;
  const name = `家人${index}`;
  state.members.push({
    name,
    short: String(index),
    tone: "tone-blue",
    health: "😐",
    note: "新加入",
  });
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

document.querySelector("#simulateJoinButton").addEventListener("click", () => {
  addInvitedMember();
  render();
});

document.querySelector("#resetDemoButton").addEventListener("click", () => {
  state = structuredClone(initialState);
  render();
  switchScreen("today");
});

document.querySelector("#addDemoTaskButton").addEventListener("click", () => {
  const random = templates[Math.floor(Math.random() * templates.length)];
  addTask(random.title, state.members[Math.floor(Math.random() * state.members.length)].name, "今天");
  render();
});

render();
