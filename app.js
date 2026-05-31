const initialState = {
  familyName: "家裡小隊",
  inviteCode: "FAM-8392",
  familyTimezone: browserTimezone(),
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
  adminTaskFilter: "open",
  pendingCheckin: null,
  members: [],
  tasks: [],
  feed: [],
  chat: [],
};

let state = structuredClone(initialState);
let pendingDeleteTaskId = null;
let pendingDeleteMemberName = null;
let pendingDeleteFamily = false;
let pendingCleanupOldData = false;
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
let pushStatus = "";
let nativePushToken = "";
let nativePushListenersReady = false;
let pendingAvatarMemberName = null;
let lastRemoteSignature = "";
let pendingAdminMemberId = "";
let pendingRequestInviteCode = "";
let securityTestRequestContext = null;
let maintenanceOpen = false;
let versionTapCount = 0;
let versionTapTimer = null;

const APP_VERSION = "2026.05.30.5";
const gameMasterStorageKey = "family-workspace-gm-mode";
const gameMasterModeFromUrl = new URLSearchParams(window.location.search).get("gm") === "1";
let gameMasterMode = gameMasterModeFromUrl || localStorage.getItem(gameMasterStorageKey) === "1";
const LEGACY_INVITE_CODE = "FAM-8392";
const SUPABASE_URL = "https://krwsmhrakpcdmocckkmf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtyd3NtaHJha3BjZG1vY2Nra21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTczNzksImV4cCI6MjA5NDk3MzM3OX0.y-msZ7K96ldRBgUqQUCK90SPZEM9BKaQqfKGV1WbNSs";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: supabaseFetch },
});

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
const avatarOptions = [
  "assets/icons/Character/Character1.png",
  "assets/icons/Character/Character2.png",
  "assets/icons/Character/Character3.png",
  "assets/icons/Character/Character4.png",
  "assets/icons/Character/Character5.png",
  "assets/icons/Character/Character6.png",
  "assets/icons/Character/Character7.png",
  "assets/icons/Character/Character8.png",
  "assets/icons/Character/Character9.png",
  "assets/icons/Character/Character10.png",
  "assets/icons/Character/Character11.png",
  "assets/icons/Character/Character12.png",
  "assets/icons/Character/Character13.png",
  "assets/icons/Character/Character14.png",
  "assets/icons/Character/Character15.png",
  "assets/icons/Character/Character16.png",
  "assets/icons/Character/Character17.png",
  "assets/icons/Character/Character18.png",
  "assets/icons/Character/Character19.png",
  "assets/icons/Character/Character20.png",
];

preloadAvatarImages();

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
const deleteMemberConfirm = document.querySelector("#deleteMemberConfirm");
const deleteMemberTitle = document.querySelector("#deleteMemberTitle");
const deleteMemberMessage = document.querySelector("#deleteMemberMessage");
const deleteFamilyConfirm = document.querySelector("#deleteFamilyConfirm");
const cleanupOldDataConfirm = document.querySelector("#cleanupOldDataConfirm");
const identityLayer = document.querySelector("#identityLayer");
const identityOptions = document.querySelector("#identityOptions");
const identityNameInput = document.querySelector("#identityNameInput");
const identityJoinButton = document.querySelector("#identityJoinButton");
const setupLayer = document.querySelector("#setupLayer");
const setupFamilyNameInput = document.querySelector("#setupFamilyNameInput");
const joinCodeInput = document.querySelector("#joinCodeInput");
const setupStatusText = document.querySelector("#setupStatusText");
const legalConsentCheckbox = document.querySelector("#legalConsentCheckbox");
const avatarLayer = document.querySelector("#avatarLayer");
const avatarChoiceGrid = document.querySelector("#avatarChoiceGrid");
const memberAdminLayer = document.querySelector("#memberAdminLayer");
const memberAdminTitle = document.querySelector("#memberAdminTitle");
const memberAdminNameInput = document.querySelector("#memberAdminNameInput");
const memberAdminStatusText = document.querySelector("#memberAdminStatusText");
const resetMemberDeviceButton = document.querySelector("#resetMemberDeviceButton");
const copyMemberLinkButton = document.querySelector("#copyMemberLinkButton");
const regenerateMemberCodeButton = document.querySelector("#regenerateMemberCodeButton");
const chooseDateButton = document.querySelector("#chooseDateButton");
const customDateInput = document.querySelector("#customDateInput");
const datePickerRow = document.querySelector(".date-picker-row");
const inviteCode = document.querySelector("#inviteCode");
const inviteStatusText = document.querySelector("#inviteStatusText");
const inviteMemberSelect = document.querySelector("#inviteMemberSelect");
const inviteMemberNameInput = document.querySelector("#inviteMemberNameInput");
const createMemberInviteButton = document.querySelector("#createMemberInviteButton");
const memberInviteStatusText = document.querySelector("#memberInviteStatusText");
const syncStatusText = document.querySelector("#syncStatusText");
const familyNameText = document.querySelector("#familyNameText");
const profileNameInput = document.querySelector("#profileNameInput");
const profileManageStatusText = document.querySelector("#profileManageStatusText");
const familyNameInput = document.querySelector("#familyNameInput");
const familyTimezoneSelect = document.querySelector("#familyTimezoneSelect");
const familyInviteText = document.querySelector("#familyInviteText");
const familyManageStatusText = document.querySelector("#familyManageStatusText");
const soundToggleButton = document.querySelector("#soundToggleButton");
const pushToggleButton = document.querySelector("#pushToggleButton");
const heroModeText = document.querySelector("#heroModeText");
const dateModeText = document.querySelector("#dateModeText");
const versionStatusText = document.querySelector("#versionStatusText");
const updateToast = document.querySelector("#updateToast");
const updateToastText = document.querySelector("#updateToastText");
const updateNowButton = document.querySelector("#updateNowButton");
const familyManageBlock = document.querySelector("#familyManageBlock");
const devTestBlock = document.querySelector("#devTestBlock");
const maintenanceToggleButton = document.querySelector("#maintenanceToggleButton");
const maintenanceActions = document.querySelector("#maintenanceActions");
const adminDataTools = document.querySelectorAll(".admin-data-tool");
const resetDemoButton = document.querySelector("#resetDemoButton");
const clearDemoButton = document.querySelector("#clearDemoButton");
const addDemoTaskButton = document.querySelector("#addDemoTaskButton");
const cleanupOldDataButton = document.querySelector("#cleanupOldDataButton");
const securityIsolationTestButton = document.querySelector("#securityIsolationTestButton");
const securityIsolationTestStatus = document.querySelector("#securityIsolationTestStatus");
const legalDocLayer = document.querySelector("#legalDocLayer");
const legalDocTitle = document.querySelector("#legalDocTitle");
const legalDocContent = document.querySelector("#legalDocContent");
const identityStorageKey = "family-workspace-current-user";
const memberIdStorageKey = "family-workspace-current-member-id";
const deviceStorageKey = "family-workspace-device-id";
const familyIdStorageKey = "family-workspace-current-family-id";
const familyInviteStorageKey = "family-workspace-current-invite-code";
const soundStorageKey = "family-workspace-sound-enabled";
const pushStorageKey = "family-workspace-push-enabled";
const demoCleanupKey = "family-workspace-demo-cleaned";
const demoMemberNames = ["Sam", "爸爸", "姐姐", "媽媽"];
const guestMember = { name: "訪客", short: "訪", tone: "tone-blue", health: "😐", note: "" };
const VAPID_PUBLIC_KEY = "BIdhbPfu0Zf-pR8_NsgcDPThj8sdLCe78ZbwEF9DzxFRuf4wTPA7n07hEDn8EB6jsE5M6V0LiDSUQAyRiQZWKZo";

const legalDocuments = {
  privacy: {
    title: "隱私權政策",
    sections: [
      {
        heading: "我們會保存的家庭資料",
        items: [
          "家庭名稱、邀請碼、家人暱稱、系統頭像選項、角色權限。",
          "任務內容、指派對象、日期、完成狀態、建立者。",
          "家庭聊天、狀態詢問、狀態回報和緊急求助訊息。",
          "裝置識別碼、推播 token、系統通知設定與基本同步紀錄。",
        ],
      },
      {
        heading: "資料用途",
        items: [
          "讓同一家庭成員同步查看任務、聊天、狀態和通知。",
          "發送任務、聊天、狀態詢問與緊急求助通知。",
          "維護服務穩定、排查錯誤、避免不同家庭資料混在一起。",
        ],
      },
      {
        heading: "資料保存與刪除",
        items: [
          "聊天紀錄預設保留 90 天。",
          "已完成任務預設保留 90 天，未完成任務會保留到完成或刪除。",
          "Admin 可以刪除家庭、家人、任務、示範資料與過期資料。",
          "刪除家庭後，該家庭的家人、任務、聊天與推播裝置資料會一併移除。",
        ],
      },
      {
        heading: "第三方服務",
        items: [
          "本服務目前使用 Supabase 保存家庭資料與同步狀態。",
          "Android 原生通知使用 Firebase Cloud Messaging 傳送推播。",
          "我們不會出售家庭內容，也不會用家庭聊天或健康狀態做廣告定向。",
        ],
      },
      {
        heading: "未成年人",
        items: [
          "本服務不是設計給 13 歲以下兒童單獨使用。",
          "未成年人使用時，應由家長或監護人建立家庭並管理成員。",
        ],
      },
    ],
  },
  terms: {
    title: "服務條款",
    sections: [
      {
        heading: "服務內容",
        items: [
          "家裡小隊提供家庭成員共用的任務、聊天、狀態詢問、推播通知與家庭管理功能。",
          "使用者需自行確認家庭成員、任務內容與通知接收對象是否正確。",
        ],
      },
      {
        heading: "使用規則",
        items: [
          "不得使用本服務傳送違法、騷擾、威脅、詐騙或侵犯他人權利的內容。",
          "邀請碼和專屬連結應只分享給可信任的家庭成員。",
          "Admin 應負責管理家庭成員、刪除錯誤資料和處理裝置綁定問題。",
        ],
      },
      {
        heading: "服務限制",
        items: [
          "網路、裝置、省電設定、第三方服務或平台政策可能影響同步與推播。",
          "我們會盡力維持服務穩定，但不保證任何通知都能即時或一定送達。",
        ],
      },
      {
        heading: "付費與訂閱",
        items: [
          "若未來提供付費或訂閱方案，價格、家庭共用範圍、取消與退款方式會在購買前清楚顯示。",
          "透過 Apple 或 Google 購買的訂閱，取消與退款通常依平台規則處理。",
        ],
      },
      {
        heading: "條款更新",
        items: [
          "我們可能因功能、法規或安全需求更新本條款。",
          "重大變更會盡量在 App 內或上架頁面提醒使用者。",
        ],
      },
    ],
  },
  emergency: {
    title: "緊急按鈕免責聲明",
    sections: [
      {
        heading: "緊急按鈕的用途",
        items: [
          "緊急按鈕只會通知目前家庭中的其他成員，並在家庭聊天中留下求助訊息。",
          "它是家庭內提醒工具，不是醫療警報系統，也不是官方緊急通報服務。",
        ],
      },
      {
        heading: "不會自動聯絡官方單位",
        items: [
          "按下緊急按鈕不會自動撥打 911、119、110、醫院、警察或消防單位。",
          "遇到生命危險、火災、犯罪、嚴重受傷或醫療緊急情況，請立即撥打當地緊急電話。",
        ],
      },
      {
        heading: "通知可能延遲或失敗",
        items: [
          "推播可能受到網路、手機電量、省電模式、通知權限、系統設定或第三方服務影響。",
          "家人沒有看到通知時，應改用電話、簡訊或其他可靠方式聯絡。",
        ],
      },
      {
        heading: "避免誤觸",
        items: [
          "請只在真的需要家人立即注意時使用緊急按鈕。",
          "若誤觸，請在家庭聊天中立即說明狀況。",
        ],
      },
    ],
  },
};

function switchScreen(name) {
  Object.entries(screens).forEach(([screenName, screen]) => {
    screen.classList.toggle("active", screenName === name);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === name);
  });
  if (name === "chat") scrollChatToBottom();
}

function isScreenActive(name) {
  return Boolean(screens[name]?.classList.contains("active"));
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
  renderAdminTaskFilter();
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
  const date = currentZonedDateParts();
  todayMeta.textContent = `${date.month}/${date.day} ${date.weekday}・${state.members.length} 人家庭・${timezoneLabel(state.familyTimezone)}`;
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

function renderAdminTaskFilter() {
  document.querySelectorAll("[data-task-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.taskFilter === state.adminTaskFilter);
  });
}

function renderFamilySpace() {
  inviteCode.textContent = state.inviteCode;
  inviteStatusText.textContent = `${state.members.length} 人已加入`;
  renderInviteMembers();
  syncStatusText.textContent = remoteReady ? "Supabase 同步中" : state.backendStatus;
  familyNameText.textContent = state.familyName;
  if (profileNameInput && document.activeElement !== profileNameInput) {
    profileNameInput.value = state.currentUser || "";
  }
  if (familyNameInput && document.activeElement !== familyNameInput) {
    familyNameInput.value = state.familyName;
  }
  if (familyTimezoneSelect && document.activeElement !== familyTimezoneSelect) {
    ensureTimezoneOption(state.familyTimezone);
    familyTimezoneSelect.value = state.familyTimezone;
  }
  if (familyInviteText) familyInviteText.textContent = state.inviteCode;
  const canManage = state.role === "admin";
  if (familyManageBlock) familyManageBlock.classList.toggle("is-hidden", !canManage);
  if (devTestBlock) devTestBlock.classList.toggle("is-hidden", !(gameMasterMode && canManage));
  adminDataTools.forEach((button) => {
    button.classList.toggle("is-hidden", !canManage);
  });
  if (maintenanceActions) maintenanceActions.classList.toggle("is-hidden", !maintenanceOpen || !canManage);
  if (maintenanceToggleButton) {
    maintenanceToggleButton.setAttribute("aria-expanded", String(maintenanceOpen && canManage));
    maintenanceToggleButton.querySelector("small").textContent = maintenanceOpen && canManage ? "收合" : "展開";
  }
  document.querySelector("#saveFamilyNameButton").disabled = !canManage;
  document.querySelector("#deleteFamilyButton").disabled = !canManage;
  if (versionStatusText && !versionStatusText.dataset.updateState) {
    versionStatusText.textContent = `目前版本 ${APP_VERSION}`;
  }
  if (cleanupOldDataButton) {
    cleanupOldDataButton.disabled = !canManage;
    cleanupOldDataButton.title = canManage ? "清理 90 天前資料" : "只有 Admin 可以清理資料";
  }
  [resetDemoButton, clearDemoButton, addDemoTaskButton].forEach((button) => {
    if (!button) return;
    button.disabled = !canManage;
    button.title = canManage ? "Admin 測試工具" : "只有 Admin 可以管理資料";
  });
  renderSoundToggle();
}

function renderInviteMembers() {
  if (!inviteMemberSelect) return;
  const inviteTargets = state.members.filter((member) => member.name !== state.currentUser);
  inviteMemberSelect.innerHTML = inviteTargets.length
    ? inviteTargets
      .map(
        (member) =>
          `<option value="${escapeHtml(String(member.id || member.name))}">${escapeHtml(member.name)}${
            member.deviceId ? "・已綁定" : ""
          }</option>`,
      )
      .join("")
    : `<option value="">先新增家人名字</option>`;
  inviteMemberSelect.disabled = !inviteTargets.length;
  if (createMemberInviteButton) createMemberInviteButton.disabled = state.role !== "admin";
}

function renderSoundToggle() {
  if (!soundToggleButton) return;
  soundToggleButton.innerHTML = settingIconMarkup(
    soundEnabled ? "assets/icons/Urgent/提示音_開.png" : "assets/icons/Urgent/提示音_關.png",
    "提示音",
    soundEnabled ? "已開" : "未開",
  );
  soundToggleButton.classList.toggle("active", soundEnabled);
  if (!pushToggleButton) return;
  const nativeApp = isNativeApp();
  const nativeSupported = nativeApp && Boolean(nativePushPlugin()) && ["android", "ios"].includes(nativePlatform());
  const browserSupported =
    !nativeApp && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const supported = nativeSupported || browserSupported;
  const permission = browserSupported ? Notification.permission : "unsupported";
  const pushLabel =
    pushStatus ||
    (nativeSupported
      ? pushEnabled
        ? "已開"
        : "未開"
      : browserSupported
      ? pushEnabled
        ? "已開"
        : permission === "denied"
          ? "已封鎖"
          : "未開"
      : "不支援");
  pushToggleButton.innerHTML = settingIconMarkup(
    pushEnabled ? "assets/icons/Urgent/系統通知_開.png" : "assets/icons/Urgent/系統通知_關.png",
    "系統通知",
    pushLabel,
  );
  pushToggleButton.classList.toggle("active", pushEnabled);
  pushToggleButton.disabled = !supported;
}

function settingIconMarkup(src, title, detail) {
  return `<img src="${escapeHtml(src)}" alt="" /><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span>`;
}

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function nativePlatform() {
  return window.Capacitor?.getPlatform?.() || "";
}

function nativePushPlugin() {
  return window.Capacitor?.Plugins?.PushNotifications || null;
}

function applyRuntimeClasses() {
  document.body.classList.toggle("native-app", isNativeApp());
}

function renderIdentityOptions() {
  if (!identityOptions) return;
  identityOptions.innerHTML = state.members
    .map(
      (member) => `
        <button class="identity-option ${member.name === state.currentUser ? "active" : ""}" type="button" data-identity="${escapeHtml(member.name)}">
          ${avatarMarkup(member)}
          <span>${escapeHtml(member.name)}</span>
        </button>
      `,
    )
    .join("");
}

function renderAvatarChoices(memberName = pendingAvatarMemberName) {
  if (!avatarChoiceGrid) return;
  const member = state.members.find((item) => item.name === memberName);
  avatarChoiceGrid.innerHTML = avatarOptions
    .map(
      (avatar) => `
        <button class="avatar-choice ${member?.short === avatar ? "active" : ""}" type="button" data-avatar-choice="${escapeHtml(avatar)}">
          <img src="${escapeHtml(avatar)}" alt="" />
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
      (member) => {
        const canAdminManage = state.role === "admin" && member.name !== state.currentUser;
        const deviceLabel = member.deviceId ? "裝置已綁定" : "尚未綁定裝置";
        return `
        <article class="member-item">
          ${canEditMemberAvatar(member) ? editableAvatarMarkup(member) : avatarMarkup(member)}
          <div class="member-main">
            <strong>${escapeHtml(member.name)}</strong>
            <small>${escapeHtml(member.note)}・${deviceLabel}</small>
          </div>
          <span class="member-health">${member.health}</span>
          ${
            canAdminManage
              ? `<div class="member-actions">
                  <button class="mini-button icon-mini-button" type="button" data-admin-member="${escapeHtml(String(member.id || ""))}" data-admin-member-name="${escapeHtml(member.name)}" aria-label="管理 ${escapeHtml(member.name)}">
                    <img src="assets/icons/Urgent/管理.png" alt="" />
                  </button>
                  <button class="delete-button" type="button" data-delete-member="${escapeHtml(member.name)}">×</button>
                </div>`
              : ""
          }
        </article>
      `;
      },
    )
    .join("")
    : emptyText("還沒有家人加入");

  memberPicker.innerHTML = state.members.length
    ? state.members
    .map(
      (member) => `
        <button class="avatar-button ${member.tone} ${member.name === state.selectedMember ? "active" : ""}" type="button" data-member="${escapeHtml(member.name)}">
          ${isImageAvatar(avatarValue(member)) ? `<img src="${escapeHtml(avatarValue(member))}" alt="" />` : escapeHtml(avatarValue(member))}
        </button>
      `,
    )
    .join("")
    : emptyText("先加入家人身份");
}

function renderTasks() {
  const today = state.tasks.filter((task) => isTaskDueToday(task));
  const overdue = state.tasks.filter((task) => isTaskOverdue(task)).sort(compareTaskDate);
  const upcoming = state.tasks
    .filter((task) => !isTaskComplete(task) && !isTaskDueToday(task) && !isTaskOverdue(task))
    .sort(compareTaskDate)
    .slice(0, 6);
  const sections = [];
  if (today.length) sections.push(today.map(taskTemplate).join(""));
  if (overdue.length) {
    sections.push(`<div class="task-section-label">逾期未完成</div>${overdue.map(taskTemplate).join("")}`);
  }
  if (upcoming.length) {
    sections.push(`<div class="task-section-label">即將到來</div>${upcoming.map(taskTemplate).join("")}`);
  }
  todayTasks.innerHTML = sections.length ? sections.join("") : emptyText("今天沒有任務");
  const adminVisibleTasks = adminTaskList();
  adminTasks.innerHTML = adminVisibleTasks.length ? adminVisibleTasks.map(taskTemplate).join("") : emptyText(adminEmptyTaskText());
}

function adminTaskList() {
  if (state.adminTaskFilter === "done") return state.tasks.filter((task) => isTaskComplete(task)).slice(0, 12);
  if (state.adminTaskFilter === "all") return state.tasks.slice(0, 30);
  return state.tasks.filter((task) => !isTaskComplete(task));
}

function adminEmptyTaskText() {
  if (state.adminTaskFilter === "done") return "最近沒有已完成任務";
  if (state.adminTaskFilter === "all") return "還沒有任務";
  return "目前沒有未完成任務";
}

function taskTemplate(task) {
  const canCompleteTask = canComplete(task);
  const canDeleteThisTask = canDeleteTask(task);
  const done = isTaskComplete(task);
  const ownerName = memberDisplayName(task.ownerId, task.owner);
  const authorName = memberDisplayName(task.authorId, task.author);
  return `
    <article class="task-item ${done ? "done" : ""}">
      <button class="check-button ${canCompleteTask ? "" : "locked"}" type="button" ${canCompleteTask ? `data-toggle-task="${task.id}"` : "disabled"} aria-label="${canCompleteTask ? "切換完成" : "只有被指派的人或 Admin 可完成"}">${done ? "✓" : ""}</button>
      <div class="task-main">
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(ownerName)}・${escapeHtml(displayTaskTime(task))}・${escapeHtml(authorName)} 建立</small>
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
  chatList.innerHTML = chatMarkupWithDates();
  if (isScreenActive("chat")) scrollChatToBottom();
}

function chatMarkupWithDates() {
  let lastDateKey = "";
  return state.chat
    .map((item) => {
      const dateKey = chatDateKey(item.createdAt);
      const divider = dateKey !== lastDateKey ? chatDateDivider(item.createdAt) : "";
      lastDateKey = dateKey;
      return `${divider}${chatTemplate(item)}`;
    })
    .join("");
}

function scrollChatToBottom() {
  if (!chatList) return;
  const chatScreen = screens.chat;
  const scroll = () => {
    chatList.scrollTop = chatList.scrollHeight;
    if (chatScreen) chatScreen.scrollTop = chatScreen.scrollHeight;
    chatList.lastElementChild?.scrollIntoView({ block: "end" });
    chatInput?.scrollIntoView({ block: "end" });
  };
  requestAnimationFrame(scroll);
  [60, 180, 420, 800].forEach((delay) => window.setTimeout(scroll, delay));
}

function renderCheckin() {
  const pending = state.pendingCheckin;
  const canAnswerPending = pending && canAnswerCheckin(pending);
  checkinCard.style.display = canAnswerPending ? "grid" : "none";
  if (!canAnswerPending) return;
  const targetText = pending.target === "all" ? "大家" : pending.target;
  checkinQuestionTitle.textContent = `${pending.from} 問${targetText}`;
  checkinQuestionFrom.textContent = "待回報";
  checkinQuestionText.textContent = pending.question;
}

function canAnswerCheckin(pending) {
  if (!state.currentUser || !pending) return false;
  if (pending.from === state.currentUser) return false;
  return pending.target === "all" || pending.target === state.currentUser;
}

function feedTemplate(item) {
  const member = memberFor(item.actorId, item.actor) || currentMember();
  const actorName = memberDisplayName(item.actorId, item.actor);
  return `
    <article class="feed-item ${item.type === "emergency" ? "emergency" : ""}">
      ${avatarMarkup(member)}
      <div class="feed-main">
        <strong>${escapeHtml(actorName)}</strong>
        <small>${escapeHtml(item.text)}</small>
      </div>
      ${canDelete(item.actor, item.actorId) ? `<button class="delete-button" type="button" data-delete-feed="${item.id}">×</button>` : ""}
    </article>
  `;
}

function chatTemplate(item) {
  const member = memberFor(item.actorId, item.actor) || currentMember();
  const actorName = memberDisplayName(item.actorId, item.actor);
  const label = item.type === "checkin" ? "狀態詢問" : item.type === "emergency" ? "緊急" : item.type === "system" ? "系統" : "訊息";
  return `
    <article class="chat-message ${item.type === "checkin" || item.type === "system" ? "system" : ""} ${item.type === "emergency" ? "emergency" : ""}">
      ${avatarMarkup(member)}
      <div class="chat-main">
        <small>${escapeHtml(actorName)}・${label}・${formatChatTimestamp(item.createdAt)}</small>
        <p>${escapeHtml(item.text)}</p>
      </div>
      ${canDelete(item.actor, item.actorId) ? `<button class="delete-button" type="button" data-delete-chat="${item.id}">×</button>` : ""}
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
  const member = currentMember();
  state.role = member?.role === "admin" ? "admin" : "member";
}

function applySavedIdentity() {
  const savedMemberId = localStorage.getItem(memberIdStorageKey);
  const savedUser = localStorage.getItem(identityStorageKey);
  if (!savedMemberId && !savedUser) return;
  const member =
    state.members.find((item) => savedMemberId && sameId(item.id, savedMemberId)) ||
    state.members.find((item) => item.name === savedUser);
  if (!member) return;
  const selectedMemberStillExists =
    state.selectedMember === "all" || state.members.some((item) => item.name === state.selectedMember);
  state.currentUser = member.name;
  if (!selectedMemberStillExists) state.selectedMember = member.name;
  saveMemberSession(member);
  applyCurrentRole();
}

function applyMemberCodeFromHash() {
  const code = memberCodeFromHash();
  if (!code) return false;
  const member = state.members.find((item) => item.memberCode === code);
  if (!member) {
    alert("這個身份連結已失效，請重新跟 Admin 拿新的連結。");
    cleanInviteHash();
    showIdentityPicker();
    return true;
  }
  if (isMemberBoundToAnotherDevice(member)) {
    alert("這個身份已經綁定另一台裝置。若是換手機或選錯人，請 Admin 先重設裝置綁定。");
    localStorage.removeItem(identityStorageKey);
    localStorage.removeItem(memberIdStorageKey);
    cleanInviteHash();
    showIdentityPicker();
    return true;
  }
  state.currentUser = member.name;
  state.selectedMember = member.name;
  member.deviceId = currentDeviceId();
  updateRemoteMemberDevice(member);
  saveMemberSession(member);
  applyCurrentRole();
  hideIdentityPicker();
  cleanInviteHash();
  return true;
}

function isMemberBoundToAnotherDevice(member) {
  return Boolean(member?.deviceId && member.deviceId !== currentDeviceId());
}

function cleanInviteHash() {
  if (!location.hash.includes("join=") && !location.hash.includes("member=")) return;
  history.replaceState(null, "", location.href.split("#")[0]);
}

function ensureIdentity() {
  const savedMemberId = localStorage.getItem(memberIdStorageKey);
  const savedUser = localStorage.getItem(identityStorageKey);
  const hasSavedMember =
    (savedMemberId && state.members.some((member) => sameId(member.id, savedMemberId))) ||
    (savedUser && state.members.some((member) => member.name === savedUser));
  if (!hasSavedMember) showIdentityPicker();
}

function showIdentityPicker() {
  if (state.currentUser && localStorage.getItem(identityStorageKey)) return;
  renderIdentityOptions();
  identityLayer.classList.add("active");
  identityLayer.setAttribute("aria-hidden", "false");
}

function hideIdentityPicker() {
  identityLayer.classList.remove("active");
  identityLayer.setAttribute("aria-hidden", "true");
}

function showSetupPicker(message = "") {
  if (setupStatusText) setupStatusText.textContent = message;
  setupLayer.classList.add("active");
  setupLayer.setAttribute("aria-hidden", "false");
}

function hideSetupPicker() {
  setupLayer.classList.remove("active");
  setupLayer.setAttribute("aria-hidden", "true");
}

function setSetupStatus(message) {
  if (setupStatusText) setupStatusText.textContent = message;
}

function hasAcceptedLegalTerms() {
  return Boolean(legalConsentCheckbox?.checked);
}

function requireLegalConsent() {
  if (hasAcceptedLegalTerms()) return true;
  setSetupStatus("請先勾選同意服務條款與隱私權政策。");
  legalConsentCheckbox?.focus();
  return false;
}

function describeRemoteError(error) {
  if (!error) return "";
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" / ");
}

function inviteCodeFromHash() {
  const match = location.hash.match(/join=([^&]+)/);
  return match ? decodeURIComponent(match[1]).trim().toUpperCase() : "";
}

function memberCodeFromHash() {
  const match = location.hash.match(/member=([^&]+)/);
  return match ? decodeURIComponent(match[1]).trim() : "";
}

function normalizeInviteCode(value) {
  return value.trim().toUpperCase();
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FAM-";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function generateMemberCode() {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `mem_${random.replace(/-/g, "").slice(0, 24)}`;
}

function saveFamilySession(family) {
  familyId = family.id;
  pendingRequestInviteCode = "";
  state.familyName = family.name;
  state.inviteCode = family.invite_code;
  state.familyTimezone = normalizeTimezone(family.timezone || state.familyTimezone || browserTimezone());
  localStorage.setItem(familyIdStorageKey, family.id);
  localStorage.setItem(familyInviteStorageKey, family.invite_code);
}

function savedFamilyInviteCode() {
  return localStorage.getItem(familyInviteStorageKey) || "";
}

function savedFamilyId() {
  return localStorage.getItem(familyIdStorageKey) || "";
}

function currentDeviceId() {
  let id = localStorage.getItem(deviceStorageKey);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(deviceStorageKey, id);
  }
  return id;
}

function supabaseFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(remoteRequestHeaders()).forEach(([key, value]) => {
    if (value) headers.set(key, value);
  });
  return fetch(input, { ...init, headers });
}

function remoteRequestHeaders() {
  const context = securityTestRequestContext || {};
  const familyHeader = context.familyId ?? familyId ?? savedFamilyId() ?? "";
  return {
    "x-family-id": familyHeader === "__none__" ? "" : familyHeader,
    "x-family-invite-code":
      context.inviteCode ?? pendingRequestInviteCode ?? state.inviteCode ?? savedFamilyInviteCode() ?? inviteCodeFromHash() ?? "",
    "x-member-id": context.memberId ?? localStorage.getItem(memberIdStorageKey) ?? currentMemberId(),
    "x-device-id": context.deviceId ?? currentDeviceId(),
  };
}

async function withRemoteRequestContext(context, action) {
  const previousContext = securityTestRequestContext;
  securityTestRequestContext = context;
  try {
    return await action();
  } finally {
    securityTestRequestContext = previousContext;
  }
}

function saveMemberSession(member) {
  localStorage.setItem(identityStorageKey, member.name);
  if (member.id) localStorage.setItem(memberIdStorageKey, String(member.id));
}

function memberInviteUrl(member) {
  const code = member.memberCode || "";
  const basePath = location.href.split("#")[0];
  return `${basePath}#join=${state.inviteCode}${code ? `&member=${encodeURIComponent(code)}` : ""}`;
}

function clearFamilySession() {
  localStorage.removeItem(familyIdStorageKey);
  localStorage.removeItem(familyInviteStorageKey);
  localStorage.removeItem(identityStorageKey);
  localStorage.removeItem(memberIdStorageKey);
  localStorage.removeItem(demoCleanupKey);
  familyId = null;
  remoteReady = false;
  lastRemoteSignature = "";
  state = structuredClone(initialState);
  if (realtimeChannel) {
    supabaseClient?.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (syncTimer) {
    window.clearInterval(syncTimer);
    syncTimer = null;
  }
}

function showAvatarPicker(memberName) {
  const member = state.members.find((item) => item.name === memberName);
  if (!member || !canEditMemberAvatar(member)) return;
  pendingAvatarMemberName = member.name;
  renderAvatarChoices(member.name);
  avatarLayer.classList.add("active");
  avatarLayer.setAttribute("aria-hidden", "false");
}

function hideAvatarPicker() {
  pendingAvatarMemberName = null;
  avatarLayer.classList.remove("active");
  avatarLayer.setAttribute("aria-hidden", "true");
}

function setMemberAdminStatus(message) {
  if (memberAdminStatusText) memberAdminStatusText.textContent = message;
}

function adminMember() {
  return (
    state.members.find((member) => pendingAdminMemberId && sameId(member.id, pendingAdminMemberId)) ||
    state.members.find((member) => member.name === memberAdminNameInput?.dataset.originalName) ||
    null
  );
}

function showMemberAdmin(memberId, fallbackName = "") {
  if (state.role !== "admin") return;
  const member = memberFor(memberId, fallbackName);
  if (!member || member.name === state.currentUser) return;
  pendingAdminMemberId = member.id || "";
  memberAdminNameInput.value = member.name;
  memberAdminNameInput.dataset.originalName = member.name;
  memberAdminTitle.textContent = `管理 ${member.name}`;
  resetMemberDeviceButton.textContent = member.deviceId ? "換手機 / 選錯人時用" : "尚未綁定裝置";
  resetMemberDeviceButton.disabled = !member.deviceId;
  copyMemberLinkButton.disabled = false;
  regenerateMemberCodeButton.disabled = false;
  setMemberAdminStatus(
    member.deviceId
      ? "這位家人已綁定裝置。換手機時請先重設，再傳新連結。"
      : member.memberCode
        ? "可傳專屬身份連結給這位家人。"
        : "尚未產生身份連結，按「傳給這位家人」會自動產生。",
  );
  memberAdminLayer.classList.add("active");
  memberAdminLayer.setAttribute("aria-hidden", "false");
}

function hideMemberAdmin() {
  pendingAdminMemberId = "";
  memberAdminLayer.classList.remove("active");
  memberAdminLayer.setAttribute("aria-hidden", "true");
}

function showUpdateToast(version) {
  if (!updateToast) return;
  updateToastText.textContent = version ? `有新版本 ${version}` : "有新版本可以更新";
  updateToast.classList.add("active");
  updateToast.setAttribute("aria-hidden", "false");
}

function hideUpdateToast() {
  if (!updateToast) return;
  updateToast.classList.remove("active");
  updateToast.setAttribute("aria-hidden", "true");
}

function setVersionStatus(text, stateName = "") {
  if (!versionStatusText) return;
  versionStatusText.textContent = text;
  if (stateName) versionStatusText.dataset.updateState = stateName;
  else delete versionStatusText.dataset.updateState;
}

function setGameMasterMode(enabled) {
  gameMasterMode = enabled;
  localStorage.setItem(gameMasterStorageKey, enabled ? "1" : "0");
  setVersionStatus(enabled ? "GM 模式已開啟" : "GM 模式已關閉", enabled ? "available" : "");
  render();
}

function handleVersionTap() {
  if (state.role !== "admin") return;
  versionTapCount += 1;
  window.clearTimeout(versionTapTimer);
  versionTapTimer = window.setTimeout(() => {
    versionTapCount = 0;
  }, 1600);
  if (versionTapCount < 5) return;
  versionTapCount = 0;
  setGameMasterMode(!gameMasterMode);
}

async function checkForAppUpdate({ silent = false } = {}) {
  if (!silent) setVersionStatus("正在檢查更新...", "checking");
  try {
    const response = await fetch(`version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Version check failed: ${response.status}`);
    const data = await response.json();
    const nextVersion = data.version;
    if (nextVersion && nextVersion !== APP_VERSION) {
      setVersionStatus(`有新版本 ${nextVersion}，點更新 App`, "available");
      showUpdateToast(nextVersion);
      return true;
    }
    hideUpdateToast();
    setVersionStatus(`目前已是最新版本 ${APP_VERSION}`);
    return false;
  } catch (error) {
    if (!silent) setVersionStatus("檢查更新失敗，稍後再試", "error");
    console.warn("Version check failed", error);
    return false;
  }
}

async function applyAppUpdate() {
  if (updateNowButton) {
    updateNowButton.disabled = true;
    updateNowButton.textContent = "更新中";
  }
  setVersionStatus("正在更新 App...", "updating");
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
      await registration?.update();
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("App update cleanup failed", error);
  } finally {
    const baseUrl = location.href.split("#")[0].split("?")[0];
    const hash = location.hash || "";
    location.replace(`${baseUrl}?v=${Date.now()}${hash}`);
  }
}

async function useIdentity(name) {
  const cleanName = name.trim();
  if (!cleanName) return;
  const deviceId = currentDeviceId();
  let member = state.members.find((item) => item.name === cleanName);
  if (!member) {
    member = {
      name: cleanName,
      short: avatarOptions[state.members.length % avatarOptions.length],
      tone: "tone-blue",
      health: "😐",
      note: "已加入家庭",
      role: state.members.length ? "member" : "admin",
      deviceId,
    };
    state.members.push(member);
    const savedMember = await insertRemoteMember(member);
    if (savedMember) member = Object.assign(member, savedMember);
    addChat(`${cleanName} 已加入家庭`, "system", cleanName);
  } else if (!member.deviceId || member.deviceId === deviceId) {
    member.deviceId = deviceId;
    await updateRemoteMemberDevice(member);
  } else {
    alert("這個身份已經綁定另一台裝置。若是換手機或選錯人，請 Admin 先重設裝置綁定。");
    return;
  }
  state.currentUser = member.name;
  state.selectedMember = member.name;
  saveMemberSession(member);
  applyCurrentRole();
  hideIdentityPicker();
  render();
}

function currentMember() {
  const savedMemberId = localStorage.getItem(memberIdStorageKey);
  return (
    state.members.find((member) => savedMemberId && sameId(member.id, savedMemberId)) ||
    state.members.find((member) => member.name === state.currentUser) ||
    state.members[0] ||
    guestMember
  );
}

function memberFor(memberId, fallbackName = "") {
  return (
    state.members.find((member) => memberId && sameId(member.id, memberId)) ||
    state.members.find((member) => fallbackName && member.name === fallbackName) ||
    null
  );
}

function memberDisplayName(memberId, fallbackName = "系統") {
  return memberFor(memberId, fallbackName)?.name || fallbackName || "系統";
}

function currentMemberId() {
  const member = currentMember();
  return member && member !== guestMember ? member.id || "" : "";
}

function isCurrentMemberRef(name, memberId) {
  const current = currentMember();
  if (!state.currentUser || !current || current === guestMember) return false;
  if (memberId && current.id) return sameId(memberId, current.id);
  return name === state.currentUser;
}

function syncCurrentMemberDevice() {
  const member = currentMember();
  if (!member || member === guestMember || member.deviceId) return;
  member.deviceId = currentDeviceId();
  updateRemoteMemberDevice(member);
}

function canDelete(author, authorId = "") {
  return Boolean(state.currentUser) && (state.role === "admin" || isCurrentMemberRef(author, authorId));
}

function canComplete(task) {
  return Boolean(state.currentUser) && (state.role === "admin" || isCurrentMemberRef(task.owner, task.ownerId));
}

function canDeleteTask(task) {
  return Boolean(state.currentUser) && (state.role === "admin" || isCurrentMemberRef(task.author, task.authorId));
}

function avatarValue(member) {
  return member?.short || member?.name?.slice(0, 1) || "家";
}

function avatarMarkup(member) {
  const value = avatarValue(member);
  if (isImageAvatar(value)) {
    return `<span class="avatar image-avatar ${member.tone}"><img src="${escapeHtml(value)}" alt="" /></span>`;
  }
  return `<span class="avatar ${member.tone}">${escapeHtml(value)}</span>`;
}

function canEditMemberAvatar(member) {
  return Boolean(state.currentUser) && (state.role === "admin" || member.name === state.currentUser);
}

function isImageAvatar(value) {
  return typeof value === "string" && value.startsWith("assets/");
}

function editableAvatarMarkup(member) {
  const value = avatarValue(member);
  const content = isImageAvatar(value) ? `<img src="${escapeHtml(value)}" alt="" />` : escapeHtml(value);
  return `<button class="avatar avatar-edit ${isImageAvatar(value) ? "image-avatar" : ""} ${member.tone}" type="button" data-edit-avatar="${escapeHtml(member.name)}" aria-label="更換${escapeHtml(member.name)}頭像">${content}</button>`;
}

function formatChatTimestamp(value) {
  if (!value) return "剛剛";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "剛剛";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  const dayDiff = Math.round((startOfToday - startOfMessageDay) / 86400000);
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `昨天 ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

function chatDateKey(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return todayISO();
  return localISODate(date);
}

function chatDateDivider(value) {
  const date = new Date(value || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const key = localISODate(safeDate);
  const today = todayISO();
  const yesterday = addDaysToISO(todayISO(), -1);
  const label =
    key === today
      ? "今天"
      : key === yesterday
        ? "昨天"
        : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", weekday: "short" }).format(safeDate);
  return `<div class="chat-date-divider" aria-label="${escapeHtml(label)}">${escapeHtml(label)}</div>`;
}

function isMissingColumnError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;
  return /column .* does not exist/i.test(message) || /schema cache/i.test(message);
}

function withoutIdColumns(payload, columns) {
  const next = { ...payload };
  columns.forEach((column) => delete next[column]);
  return next;
}

async function insertRemoteMessage(message) {
  const payload = toRemoteMessage(message);
  let result = await supabaseClient.from("messages").insert(payload);
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabaseClient.from("messages").insert(withoutIdColumns(payload, ["actor_member_id"]));
  }
  return result;
}

async function insertRemoteTask(task) {
  const payload = toRemoteTask(task);
  let result = await supabaseClient.from("tasks").insert(payload).select().single();
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabaseClient
      .from("tasks")
      .insert(withoutIdColumns(payload, ["owner_member_id", "author_member_id"]))
      .select()
      .single();
  }
  return result;
}

function addFeed(text, type = "normal", actor = state.currentUser || "系統") {
  const actorMember = memberFor("", actor);
  state.feed.unshift({
    id: Date.now() + Math.random(),
    actor,
    actorId: actorMember?.id || (actor === state.currentUser ? currentMemberId() : ""),
    text,
    type,
  });
}

function addChat(text, type = "normal", actor = state.currentUser || "系統") {
  const actorMember = memberFor("", actor);
  const actorId = actorMember?.id || (actor === state.currentUser ? currentMemberId() : "");
  const localMessage = {
    id: `local-${Date.now()}-${Math.random()}`,
    actor,
    actorId,
    text,
    type,
    createdAt: new Date().toISOString(),
  };
  state.chat.push(localMessage);
  if (remoteReady && familyId) {
    insertRemoteMessage({ actor, actorId, text, type }).then(({ error }) => {
      if (error) setSyncError("Message sync failed", error);
      else {
        loadRemoteData();
        if (type === "normal") {
          notifyFamilyEvent({ kind: "chat", text, actorName: actor, actorMember });
        }
      }
    });
  }
}

async function addTask(title = state.selectedTemplate, owner = state.selectedMember, time = state.selectedTime) {
  const schedule = scheduleFromTime(time);
  const ownerMember = memberFor("", owner);
  const authorMember = currentMember();
  const task = {
    id: `local-${Date.now()}-${Math.random()}`,
    title,
    owner,
    ownerId: ownerMember?.id || "",
    time,
    dueDate: schedule.dueDate,
    repeat: schedule.repeat,
    author: state.currentUser,
    authorId: authorMember?.id || "",
    done: false,
  };
  if (remoteReady && familyId) {
    const { data, error } = await insertRemoteTask(task);
    if (error) {
      setSyncError("Task sync failed", error);
      state.tasks.unshift(task);
    } else {
      state.tasks.unshift(fromRemoteTask(data));
      state.backendStatus = "Supabase 已連線";
      await loadRemoteData();
      notifyFamilyEvent({
        kind: "task",
        title,
        owner,
        ownerId: ownerMember?.id || "",
        actorName: state.currentUser,
        actorMember: authorMember,
      });
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
  pushEnabled = localStorage.getItem(pushStorageKey) === "true";
  if (!isNativeApp()) {
    const browserNotificationPermission =
      typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    pushEnabled = pushEnabled && browserNotificationPermission === "granted";
  }
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

function uint8ArrayToUrlBase64(value) {
  return window
    .btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function enablePushNotifications() {
  if (isNativeApp()) {
    await enableNativePushNotifications();
    return;
  }
  if (typeof Notification === "undefined") {
    pushStatus = "不支援";
    state.backendStatus = "此裝置不支援系統通知";
    render();
    return;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    pushStatus = "不支援";
    state.backendStatus = "此裝置不支援系統通知";
    render();
    return;
  }
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  pushStatus = "開啟中";
  pushToggleButton.disabled = true;
  renderSoundToggle();
  let permission = Notification.permission;
  if (permission !== "granted") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    pushStatus = permission === "denied" ? "已封鎖" : "未允許";
    pushToggleButton.disabled = false;
    state.backendStatus = "系統通知未允許";
    render();
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    const existingKey = subscription?.options?.applicationServerKey
      ? uint8ArrayToUrlBase64(subscription.options.applicationServerKey)
      : "";
    if (subscription && existingKey !== VAPID_PUBLIC_KEY) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription =
      subscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    if (remoteReady && familyId) {
      const memberId = currentMemberId();
      const payload = {
        endpoint: subscription.endpoint,
        family_id: familyId,
        member_name: state.currentUser,
        member_id: memberId || null,
        subscription: subscription.toJSON(),
      };
      let result = await supabaseClient.from("push_subscriptions").upsert(payload, { onConflict: "endpoint" });
      if (result.error && isMissingColumnError(result.error)) {
        result = await supabaseClient
          .from("push_subscriptions")
          .upsert(withoutIdColumns(payload, ["member_id"]), { onConflict: "endpoint" });
      }
      const { error } = result;
      if (error) {
        pushStatus = "同步失敗";
        pushToggleButton.disabled = false;
        setSyncError("Push subscription sync failed", error);
        render();
        return;
      }
    }
  } catch (error) {
    pushStatus = "開啟失敗";
    pushToggleButton.disabled = false;
    setSyncError("Push enable failed", error);
    render();
    return;
  }
  pushEnabled = true;
  pushStatus = "";
  pushToggleButton.disabled = false;
  localStorage.setItem(pushStorageKey, "true");
  state.backendStatus = "系統通知已開啟";
  render();
}

async function enableNativePushNotifications() {
  const PushNotifications = nativePushPlugin();
  const platform = nativePlatform();
  if (!PushNotifications || !["android", "ios"].includes(platform)) {
    pushStatus = "原生不支援";
    state.backendStatus = "此 App 版本尚未接原生推播";
    render();
    return;
  }
  if (!state.currentUser) {
    showIdentityPicker();
    return;
  }
  if (!remoteReady || !familyId) {
    pushStatus = "稍後再試";
    state.backendStatus = "Supabase 尚未同步，稍後再開通知";
    render();
    return;
  }

  pushStatus = "開啟中";
  pushToggleButton.disabled = true;
  renderSoundToggle();

  try {
    setupNativePushListeners();
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      pushStatus = "未允許";
      pushToggleButton.disabled = false;
      state.backendStatus = "原生系統通知未允許";
      render();
      return;
    }
    await PushNotifications.register();
    pushEnabled = true;
    pushStatus = "等待 token";
    localStorage.setItem(pushStorageKey, "true");
    state.backendStatus = "正在註冊原生推播";
  } catch (error) {
    pushStatus = "開啟失敗";
    pushToggleButton.disabled = false;
    setSyncError("Native push enable failed", error);
  }
  render();
}

async function initNativePushIfEnabled() {
  if (!pushEnabled || !isNativeApp() || !state.currentUser || !remoteReady || !familyId) return;
  const PushNotifications = nativePushPlugin();
  const platform = nativePlatform();
  if (!PushNotifications || !["android", "ios"].includes(platform)) return;
  try {
    setupNativePushListeners();
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") return;
    await PushNotifications.register();
  } catch (error) {
    console.warn("Native push init skipped", error);
  }
}

function setupNativePushListeners() {
  if (nativePushListenersReady) return;
  const PushNotifications = nativePushPlugin();
  if (!PushNotifications) return;
  nativePushListenersReady = true;

  PushNotifications.addListener("registration", async (token) => {
    nativePushToken = token.value || "";
    pushEnabled = Boolean(nativePushToken);
    pushStatus = nativePushToken ? "" : "無 token";
    pushToggleButton.disabled = false;
    localStorage.setItem(pushStorageKey, String(pushEnabled));
    if (nativePushToken) await syncNativePushToken(nativePushToken);
    render();
  });

  PushNotifications.addListener("registrationError", (error) => {
    pushStatus = "註冊失敗";
    pushToggleButton.disabled = false;
    setSyncError("Native push registration failed", error);
    render();
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    playTone(notification?.data?.type === "emergency" ? "emergency" : "message");
  });

  PushNotifications.addListener("pushNotificationActionPerformed", () => {
    switchScreen("chat");
  });
}

async function syncNativePushToken(token = nativePushToken) {
  if (!token || !remoteReady || !familyId || !state.currentUser) return;
  const memberId = currentMemberId();
  const payload = {
    family_id: familyId,
    member_id: memberId || null,
    member_name: state.currentUser,
    device_id: currentDeviceId(),
    platform: nativePlatform(),
    token,
    enabled: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("native_push_tokens").upsert(payload, { onConflict: "token" });
  if (error) {
    pushStatus = "同步失敗";
    setSyncError("Native push token sync failed", error);
    return;
  }
  pushStatus = "";
  state.backendStatus = "原生通知已開啟";
}

async function sendPushNotification(payload) {
  if (!remoteReady || !familyId) return;
  const { error } = await supabaseClient.functions.invoke("super-function", {
    body: {
      familyId,
      ...payload,
    },
  });
  if (error) console.warn("Push send failed", error);
}

function memberNotificationRef(member) {
  return {
    id: member?.id || "",
    name: member?.name || "",
  };
}

function notificationTargetsFor(event) {
  const actor = memberNotificationRef(event.actorMember || currentMember());
  const withoutActor = (member) => {
    if (!member) return false;
    if (actor.id && member.id) return !sameId(member.id, actor.id);
    return member.name !== actor.name;
  };
  const everyoneElse = () => state.members.filter(withoutActor);

  if (event.kind === "task") {
    const owner = memberFor(event.ownerId || "", event.owner || "");
    return owner && withoutActor(owner) ? [owner] : [];
  }

  if (event.kind === "checkin") {
    if (event.target === "all") return everyoneElse();
    const target = memberFor(event.targetId || "", event.target || "");
    return target && withoutActor(target) ? [target] : [];
  }

  return everyoneElse();
}

function notificationPayloadFor(event, targets) {
  const actorName = event.actorName || state.currentUser || "家人";
  const targetNames = targets.map((member) => member.name).filter(Boolean);
  const targetIds = targets.map((member) => member.id).filter(Boolean);

  const base = {
    type: event.kind,
    targetMemberNames: targetNames,
    targetMemberIds: targetIds,
    excludeMember: actorName,
    excludeMemberId: event.actorMember?.id || currentMemberId(),
  };

  if (event.kind === "task") {
    return {
      ...base,
      title: "新增任務",
      body: `${actorName} 指派：${event.title}`,
    };
  }

  if (event.kind === "checkin") {
    return {
      ...base,
      title: "狀態詢問",
      body: `${actorName} 問：${event.question}`,
    };
  }

  if (event.kind === "emergency") {
    return {
      ...base,
      title: "緊急求助",
      body: `${actorName}：請家人立刻確認。`,
    };
  }

  return {
    ...base,
    title: "家庭新訊息",
    body: `${actorName}：${event.text}`,
  };
}

function notifyFamilyEvent(event) {
  const targets = notificationTargetsFor(event);
  if (!targets.length) {
    console.info("Notification skipped: no targets", event.kind);
    return;
  }
  sendPushNotification(notificationPayloadFor(event, targets));
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
  if (
    newestMessage &&
    newestMessage.id !== lastSeenMessageId &&
    !isCurrentMemberRef(newestMessage.actor, newestMessage.actor_member_id)
  ) {
    playTone(newestMessage.type === "emergency" ? "emergency" : "message");
  }
  if (newestTask && newestTask.id !== lastSeenTaskId && !isCurrentMemberRef(newestTask.author, newestTask.author_member_id)) {
    playTone("task");
  }
  lastSeenMessageId = newestMessage?.id || lastSeenMessageId;
  lastSeenTaskId = newestTask?.id || lastSeenTaskId;
}

function legalDocumentMarkup(document) {
  return document.sections
    .map(
      (section) => `
        <section>
          <h3>${escapeHtml(section.heading)}</h3>
          <ul>
            ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      `,
    )
    .join("");
}

function openLegalDocument(key) {
  const document = legalDocuments[key];
  if (!document || !legalDocLayer || !legalDocTitle || !legalDocContent) return;
  legalDocTitle.textContent = document.title;
  legalDocContent.innerHTML = legalDocumentMarkup(document);
  legalDocLayer.classList.add("active");
  legalDocLayer.setAttribute("aria-hidden", "false");
}

function closeLegalDocument() {
  legalDocLayer?.classList.remove("active");
  legalDocLayer?.setAttribute("aria-hidden", "true");
}

function sameId(a, b) {
  return String(a) === String(b);
}

function preloadAvatarImages() {
  avatarOptions.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function remoteSignature(members, tasks, messages) {
  return JSON.stringify({
    members: members.map((member) => [
      member.id,
      member.name,
      member.short,
      member.role,
      member.device_id,
      member.member_code,
      member.health,
      member.note,
      member.updated_at,
    ]),
    tasks: tasks.map((task) => [
      task.id,
      task.title,
      task.owner,
      task.owner_member_id,
      task.author,
      task.author_member_id,
      task.time_label,
      task.due_date,
      task.repeat,
      task.done,
      task.last_completed_date,
      task.updated_at,
    ]),
    messages: messages.map((message) => [
      message.id,
      message.actor,
      message.actor_member_id,
      message.text,
      message.type,
      message.created_at,
    ]),
  });
}

function fromRemoteMember(member) {
  return {
    id: member.id,
    name: member.name,
    short: member.short || avatarOptions[0],
    tone: member.role === "admin" ? "tone-gold" : "tone-teal",
    health: member.health || "😐",
    note: member.note || "已加入家庭",
    role: member.role || "member",
    deviceId: member.device_id || "",
    memberCode: member.member_code || "",
  };
}

function fromRemoteTask(task) {
  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    ownerId: task.owner_member_id || "",
    author: task.author,
    authorId: task.author_member_id || "",
    time: task.time_label,
    dueDate: normalizeDateValue(task.due_date),
    repeat: task.repeat || (task.time_label === "每天" ? "daily" : null),
    done: task.done,
    lastCompletedDate: normalizeDateValue(task.last_completed_date),
    createdAt: task.created_at,
  };
}

function toRemoteTask(task) {
  return {
    family_id: familyId,
    title: task.title,
    owner: task.owner,
    owner_member_id: task.ownerId || null,
    author: task.author,
    author_member_id: task.authorId || null,
    time_label: task.time,
    due_date: normalizeDateValue(task.dueDate),
    done: task.done,
    last_completed_date: normalizeDateValue(task.lastCompletedDate) || null,
  };
}

function toRemoteMessage(message) {
  return {
    family_id: familyId,
    actor: message.actor,
    actor_member_id: message.actorId || null,
    text: message.text,
    type: message.type,
  };
}

function fromRemoteMessage(message) {
  return {
    id: message.id,
    actor: message.actor,
    actorId: message.actor_member_id || "",
    text: message.text,
    type: message.type || "normal",
    createdAt: message.created_at,
  };
}

function derivePendingCheckin(messages) {
  if (!state.currentUser) return null;
  const currentId = currentMemberId();
  const newestOwnAnswer = [...messages]
    .reverse()
    .find(
      (message) =>
        isCurrentMemberRef(message.actor, message.actor_member_id) &&
        message.type === "checkin" &&
        message.text.startsWith("回報狀態"),
    );
  const newestQuestion = [...messages].reverse().find((message) => {
    if (isCurrentMemberRef(message.actor, message.actor_member_id) || message.type !== "checkin") return false;
    const parsed = parseCheckinQuestion(message);
    if (!parsed) return false;
    if (newestOwnAnswer && message.created_at <= newestOwnAnswer.created_at) return false;
    return parsed.target === "all" || parsed.target === state.currentUser || (currentId && parsed.targetId === currentId);
  });
  if (!newestQuestion) return null;
  const parsed = parseCheckinQuestion(newestQuestion);
  return {
    from: memberDisplayName(newestQuestion.actor_member_id, newestQuestion.actor),
    target: parsed.target,
    question: parsed.question,
    messageId: newestQuestion.id,
  };
}

function parseCheckinQuestion(message) {
  const match = message.text.match(/^問 (.+?)：(.+)$/);
  if (!match) return null;
  const targetMember = memberFor("", match[1]);
  return {
    target: match[1] === "大家" ? "all" : match[1],
    targetId: targetMember?.id || "",
    question: match[2],
  };
}

function messageToFeed(message) {
  return {
    id: message.id,
    actor: message.actor,
    actorId: message.actor_member_id || "",
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
    const hashInviteCode = inviteCodeFromHash();
    const storedInviteCode = savedFamilyInviteCode();
    const storedFamilyId = savedFamilyId();
    const legacyUser = localStorage.getItem(identityStorageKey);
    const inviteCode = hashInviteCode || storedInviteCode || (legacyUser ? LEGACY_INVITE_CODE : "");
    if (!inviteCode && !storedFamilyId) {
      showSetupPicker();
      return;
    }
    const family = inviteCode ? await findFamilyByInviteCode(inviteCode) : await findFamilyById(storedFamilyId);
    if (!family) {
      showSetupPicker("找不到原本家庭，請用邀請碼重新加入。");
      return;
    }
    saveFamilySession(family);
    remoteReady = true;
    hideSetupPicker();
    await loadRemoteData();
    subscribeRemote();
    startAutoSync();
  } catch (error) {
    setSyncError("Supabase init failed", error);
    applySavedIdentity();
    ensureIdentity();
  }
}

async function findFamilyByInviteCode(inviteCode) {
  pendingRequestInviteCode = normalizeInviteCode(inviteCode);
  const { data, error } = await supabaseClient
    .from("families")
    .select("*")
    .eq("invite_code", normalizeInviteCode(inviteCode))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findFamilyById(id) {
  pendingRequestInviteCode = "";
  familyId = id;
  const { data, error } = await supabaseClient.from("families").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createFamily() {
  if (!supabaseClient) return;
  if (!requireLegalConsent()) return;
  const familyName = setupFamilyNameInput.value.trim() || "我的家";
  setSetupStatus("正在建立家庭...");
  let family = null;
  const created = await withRemoteRequestContext({ familyId: "__none__", inviteCode: "" }, () =>
    supabaseClient.rpc("create_family", {
      family_name: familyName,
      family_timezone: browserTimezone(),
    }),
  );
  pendingRequestInviteCode = "";
  if (!created.error) family = created.data;
  if (!family) {
    const detail = describeRemoteError(created.error);
    setSetupStatus(detail ? `建立失敗：${detail}` : "建立失敗，請稍後再試。");
    return;
  }
  await activateFamily(family);
  showIdentityPicker();
}

async function joinFamily() {
  if (!supabaseClient) return;
  if (!requireLegalConsent()) return;
  const inviteCode = normalizeInviteCode(joinCodeInput.value);
  if (!inviteCode) {
    setSetupStatus("請輸入邀請碼。");
    return;
  }
  setSetupStatus("正在加入家庭...");
  const family = await findFamilyByInviteCode(inviteCode);
  if (!family) {
    setSetupStatus("找不到這個家庭，請確認邀請碼。");
    return;
  }
  await activateFamily(family);
  showIdentityPicker();
}

async function activateFamily(family) {
  saveFamilySession(family);
  remoteReady = true;
  lastRemoteSignature = "";
  hideSetupPicker();
  await loadRemoteData();
  subscribeRemote();
  startAutoSync();
  render();
}

async function saveFamilyName() {
  if (state.role !== "admin" || !remoteReady || !familyId) return;
  const nextName = familyNameInput.value.trim();
  const nextTimezone = normalizeTimezone(familyTimezoneSelect?.value || state.familyTimezone);
  if (!nextName) {
    familyManageStatusText.textContent = "家庭名稱不能空白。";
    return;
  }
  familyManageStatusText.textContent = "正在儲存...";
  let result = await supabaseClient.from("families").update({ name: nextName, timezone: nextTimezone }).eq("id", familyId);
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabaseClient.from("families").update({ name: nextName }).eq("id", familyId);
  }
  const { error } = result;
  if (error) {
    familyManageStatusText.textContent = "儲存失敗，請稍後再試。";
    setSyncError("Family name update failed", error);
    return;
  }
  state.familyName = nextName;
  state.familyTimezone = nextTimezone;
  familyManageStatusText.textContent = "家庭設定已更新。";
  render();
}

function setProfileManageStatus(message) {
  if (profileManageStatusText) profileManageStatusText.textContent = message;
}

async function saveProfileName() {
  const member = currentMember();
  if (!member || member === guestMember) {
    showIdentityPicker();
    return;
  }
  const nextName = profileNameInput.value.trim();
  const result = await renameMember(member, nextName);
  setProfileManageStatus(result.message);
  if (!result.ok) return;
  render();
}

async function renameMember(member, nextName) {
  const cleanName = nextName.trim();
  const oldName = member.name;
  if (!cleanName) return { ok: false, message: "名字不能空白。" };
  if (cleanName === oldName) return { ok: false, message: "名字沒有變更。" };
  const nameTaken = state.members.some((item) => {
    const isSelf = member.id ? sameId(item.id, member.id) : item.name === oldName;
    return item.name === cleanName && !isSelf;
  });
  if (nameTaken) return { ok: false, message: "這個名字已經有人使用。" };

  const renamedMember = { ...member, name: cleanName };
  if (remoteReady && familyId) {
    const memberQuery = supabaseClient.from("members").update({ name: cleanName }).eq("family_id", familyId);
    const { error: memberError } = member.id ? await memberQuery.eq("id", member.id) : await memberQuery.eq("name", oldName);
    if (memberError) {
      setSyncError("Member rename failed", memberError);
      return { ok: false, message: "名字儲存失敗，請稍後再試。" };
    }
    const updates = [
      supabaseClient.from("tasks").update({ owner: cleanName }).eq("family_id", familyId).eq("owner", oldName),
      supabaseClient.from("tasks").update({ author: cleanName }).eq("family_id", familyId).eq("author", oldName),
      supabaseClient.from("messages").update({ actor: cleanName }).eq("family_id", familyId).eq("actor", oldName),
      supabaseClient.from("push_subscriptions").update({ member_name: cleanName }).eq("family_id", familyId).eq("member_name", oldName),
      supabaseClient.from("native_push_tokens").update({ member_name: cleanName }).eq("family_id", familyId).eq("member_name", oldName),
    ];
    const results = await Promise.all(updates);
    const relatedError = results.find((result) => result.error)?.error;
    if (relatedError) setSyncError("Related rename sync failed", relatedError);
  }

  state.members = state.members.map((item) =>
    (member.id && sameId(item.id, member.id)) || item.name === oldName ? renamedMember : item,
  );
  state.tasks = state.tasks.map((task) => ({
    ...task,
    owner: task.owner === oldName ? cleanName : task.owner,
    author: task.author === oldName ? cleanName : task.author,
  }));
  state.chat = state.chat.map((item) => ({
    ...item,
    actor: item.actor === oldName ? cleanName : item.actor,
  }));
  if (state.currentUser === oldName || (member.id && sameId(member.id, currentMemberId()))) {
    state.currentUser = cleanName;
    saveMemberSession(renamedMember);
  }
  if (state.selectedMember === oldName) state.selectedMember = cleanName;
  if (remoteReady && familyId) await loadRemoteData(false);
  return { ok: true, message: "名字已更新。" };
}

async function saveAdminMemberName() {
  if (state.role !== "admin") return;
  const member = adminMember();
  if (!member || member.name === state.currentUser) {
    setMemberAdminStatus("找不到這位家人。");
    return;
  }
  setMemberAdminStatus("正在儲存名字...");
  const result = await renameMember(member, memberAdminNameInput.value);
  setMemberAdminStatus(result.message);
  if (!result.ok) return;
  const updated = memberFor(member.id, memberAdminNameInput.value);
  if (updated) {
    pendingAdminMemberId = updated.id || "";
    memberAdminNameInput.dataset.originalName = updated.name;
    memberAdminTitle.textContent = `管理 ${updated.name}`;
  }
  render();
}

async function resetAdminMemberDevice() {
  if (state.role !== "admin") return;
  const member = adminMember();
  if (!member || member.name === state.currentUser) {
    setMemberAdminStatus("找不到這位家人。");
    return;
  }
  if (!member.deviceId) {
    setMemberAdminStatus("這位家人目前尚未綁定裝置。");
    return;
  }
  setMemberAdminStatus("正在重設裝置...");
  if (remoteReady && familyId && member.id) {
    const results = await Promise.all([
      supabaseClient.from("members").update({ device_id: null }).eq("family_id", familyId).eq("id", member.id),
      supabaseClient.from("push_subscriptions").delete().eq("family_id", familyId).eq("member_id", member.id),
      supabaseClient.from("push_subscriptions").delete().eq("family_id", familyId).eq("member_name", member.name),
      supabaseClient.from("native_push_tokens").delete().eq("family_id", familyId).eq("member_id", member.id),
      supabaseClient.from("native_push_tokens").delete().eq("family_id", familyId).eq("member_name", member.name),
    ]);
    const error = results.find((result) => result.error && !isMissingColumnError(result.error))?.error;
    if (error) {
      setMemberAdminStatus("重設失敗，請稍後再試。");
      setSyncError("Member device reset failed", error);
      return;
    }
  }
  member.deviceId = "";
  await loadRemoteData(false);
  setMemberAdminStatus("裝置綁定已重設。請按「傳給這位家人」複製連結，讓家人用新手機開啟。");
  resetMemberDeviceButton.textContent = "尚未綁定裝置";
  resetMemberDeviceButton.disabled = true;
  copyMemberLinkButton.disabled = false;
  render();
}

async function ensureMemberCode(member, { regenerate = false } = {}) {
  if (!member || !member.id || state.role !== "admin" || !remoteReady || !familyId) return null;
  if (member.memberCode && !regenerate) return member.memberCode;
  const memberCode = generateMemberCode();
  const { error } = await supabaseClient
    .from("members")
    .update({ member_code: memberCode })
    .eq("family_id", familyId)
    .eq("id", member.id);
  if (error) {
    if (isMissingColumnError(error)) {
      setMemberAdminStatus("請先在 Supabase 跑 supabase_member_codes.sql。");
    } else {
      setMemberAdminStatus("身份連結產生失敗，請稍後再試。");
      setSyncError("Member code update failed", error);
    }
    return null;
  }
  member.memberCode = memberCode;
  await loadRemoteData(false);
  return memberCode;
}

async function copyMemberInviteLink() {
  const member = adminMember();
  if (!member) return;
  setMemberAdminStatus("正在準備身份連結...");
  const code = await ensureMemberCode(member);
  if (!code) return;
  const linkedMember = memberFor(member.id, member.name) || { ...member, memberCode: code };
  try {
    await navigator.clipboard.writeText(memberInviteUrl(linkedMember));
    setMemberAdminStatus(
      linkedMember.deviceId
        ? `已複製 ${linkedMember.name} 的連結。若是換手機，請先重設裝置綁定。`
        : `已複製 ${linkedMember.name} 的專屬連結。`,
    );
  } catch {
    setMemberAdminStatus("複製失敗，請稍後再試。");
  }
}

async function regenerateMemberInviteLink() {
  const member = adminMember();
  if (!member) return;
  setMemberAdminStatus("正在重新產生身份連結...");
  const code = await ensureMemberCode(member, { regenerate: true });
  if (!code) return;
  const linkedMember = memberFor(member.id, member.name) || { ...member, memberCode: code };
  try {
    await navigator.clipboard.writeText(memberInviteUrl(linkedMember));
    setMemberAdminStatus(`已重新產生並複製 ${linkedMember.name} 的身份連結。舊連結將失效。`);
  } catch {
    setMemberAdminStatus("已重新產生身份連結，但複製失敗。");
  }
}

function selectedInviteMember() {
  const selected = inviteMemberSelect?.value || "";
  if (!selected) return null;
  return state.members.find((member) => sameId(member.id, selected) || member.name === selected) || null;
}

async function createMemberInvite() {
  if (state.role !== "admin") return;
  if (!memberInviteStatusText) return;
  const typedName = inviteMemberNameInput.value.trim();
  let member = typedName ? state.members.find((item) => item.name === typedName) : selectedInviteMember();
  if (!member && typedName) {
    member = {
      name: typedName,
      short: avatarOptions[state.members.length % avatarOptions.length],
      tone: "tone-blue",
      health: "😐",
      note: "等待加入",
      role: "member",
    };
    state.members.push(member);
    const savedMember = await insertRemoteMember(member, { bindDevice: false });
    if (savedMember) member = Object.assign(member, savedMember);
    addFeed(`新增成員：${member.name}`);
  }
  if (!member) {
    memberInviteStatusText.textContent = "請選一位家人，或輸入新名字。";
    return;
  }
  memberInviteStatusText.textContent = "正在產生專屬連結...";
  const code = await ensureMemberCode(member);
  if (!code) {
    memberInviteStatusText.textContent = "產生失敗，請先確認 Supabase 已跑 member code SQL。";
    return;
  }
  const linkedMember = memberFor(member.id, member.name) || { ...member, memberCode: code };
  try {
    await navigator.clipboard.writeText(memberInviteUrl(linkedMember));
    memberInviteStatusText.textContent = linkedMember.deviceId
      ? `${linkedMember.name} 已綁定裝置。連結已複製；換手機請先到管理重設。`
      : `${linkedMember.name} 尚未綁定。專屬連結已複製，可傳給家人。`;
  } catch {
    memberInviteStatusText.textContent = "連結已產生，但複製失敗。請再試一次。";
  }
  inviteMemberNameInput.value = "";
  markSynced();
  render();
}

function openDeleteFamilyConfirm() {
  if (state.role !== "admin") return;
  pendingDeleteFamily = true;
  deleteFamilyConfirm.classList.add("active");
  deleteFamilyConfirm.setAttribute("aria-hidden", "false");
}

function closeDeleteFamilyConfirm() {
  pendingDeleteFamily = false;
  deleteFamilyConfirm.classList.remove("active");
  deleteFamilyConfirm.setAttribute("aria-hidden", "true");
}

async function deleteCurrentFamily() {
  if (!pendingDeleteFamily || state.role !== "admin" || !remoteReady || !familyId) {
    closeDeleteFamilyConfirm();
    return;
  }
  const deletingFamilyId = familyId;
  closeDeleteFamilyConfirm();
  familyManageStatusText.textContent = "正在刪除家庭...";
  await Promise.all([
    supabaseClient.from("push_subscriptions").delete().eq("family_id", deletingFamilyId),
    supabaseClient.from("native_push_tokens").delete().eq("family_id", deletingFamilyId),
    supabaseClient.from("tasks").delete().eq("family_id", deletingFamilyId),
    supabaseClient.from("messages").delete().eq("family_id", deletingFamilyId),
    supabaseClient.from("members").delete().eq("family_id", deletingFamilyId),
  ]);
  const { error } = await supabaseClient.from("families").delete().eq("id", deletingFamilyId);
  if (error) {
    familyManageStatusText.textContent = "刪除失敗，請稍後再試。";
    setSyncError("Family delete failed", error);
    return;
  }
  clearFamilySession();
  render();
  switchScreen("today");
  showSetupPicker("家庭已刪除，請建立或加入家庭。");
}

function openCleanupOldDataConfirm() {
  if (state.role !== "admin") {
    setVersionStatus("只有 Admin 可以清理資料", "error");
    return;
  }
  if (!remoteReady || !familyId) {
    setVersionStatus("Supabase 尚未連線，稍後再試", "error");
    return;
  }
  pendingCleanupOldData = true;
  cleanupOldDataConfirm.classList.add("active");
  cleanupOldDataConfirm.setAttribute("aria-hidden", "false");
}

function closeCleanupOldDataConfirm() {
  pendingCleanupOldData = false;
  cleanupOldDataConfirm.classList.remove("active");
  cleanupOldDataConfirm.setAttribute("aria-hidden", "true");
}

async function cleanupOldData() {
  if (!pendingCleanupOldData || state.role !== "admin" || !remoteReady || !familyId) {
    closeCleanupOldDataConfirm();
    return;
  }
  closeCleanupOldDataConfirm();
  setVersionStatus("正在清理 90 天前資料...", "cleaning");
  const cutoff = localISODate(addDays(currentDate(), -90));
  const cutoffTimestamp = `${cutoff}T00:00:00`;
  const { error: messageError } = await supabaseClient
    .from("messages")
    .delete()
    .eq("family_id", familyId)
    .lt("created_at", cutoffTimestamp);
  const { error: taskError } = await supabaseClient
    .from("tasks")
    .delete()
    .eq("family_id", familyId)
    .eq("done", true)
    .lt("created_at", cutoffTimestamp);
  if (messageError || taskError) {
    setVersionStatus("清理失敗，請稍後再試", "error");
    setSyncError("Old data cleanup failed", messageError || taskError);
    return;
  }
  state.chat = state.chat.filter((message) => chatDateKey(message.createdAt) >= cutoff);
  state.tasks = state.tasks.filter((task) => !task.done || task.createdAt >= cutoff);
  await loadRemoteData(false);
  setVersionStatus("90 天前資料已清理");
  render();
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

    const nextSignature = remoteSignature(members, tasks, messages);
    if (nextSignature === lastRemoteSignature) {
      notifyRemoteChanges(messages, tasks);
      return;
    }
    lastRemoteSignature = nextSignature;

    if (shouldClearDemoData(members, tasks, messages)) {
      await clearRemoteDemoData();
      localStorage.setItem(demoCleanupKey, "true");
      lastRemoteSignature = "";
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
  applyMemberCodeFromHash();
    syncCurrentMemberDevice();
    state.pendingCheckin = derivePendingCheckin(messages);
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

function hasLiveFamilyData() {
  const hasRealMember = state.members.some((member) => !demoMemberNames.includes(member.name));
  const hasRealTask = state.tasks.some(
    (task) => !demoMemberNames.includes(task.owner) || !demoMemberNames.includes(task.author)
  );
  const hasRealMessage = state.chat.some((message) => !demoMemberNames.includes(message.actor) && message.actor !== "系統");
  return hasRealMember || hasRealTask || hasRealMessage;
}

function canRunDataTool() {
  if (state.role === "admin") return true;
  setVersionStatus("只有 Admin 可以管理資料", "error");
  return false;
}

function canResetDemoData() {
  if (!canRunDataTool()) return false;
  if (!hasLiveFamilyData()) return true;
  setVersionStatus("已有正式資料，沒有移除任何內容", "error");
  return false;
}

function setSecurityTestStatus(message) {
  if (securityIsolationTestStatus) securityIsolationTestStatus.textContent = message;
}

async function runSecurityIsolationTest() {
  if (!gameMasterMode || state.role !== "admin") return;
  if (!remoteReady || !familyId || !supabaseClient) {
    setSecurityTestStatus("Supabase 尚未連線。");
    return;
  }

  securityIsolationTestButton.disabled = true;
  setSecurityTestStatus("正在建立隔離測試家庭...");
  const testInviteCode = generateInviteCode();
  let testFamily = null;
  let testMember = null;
  try {
    testFamily = await withRemoteRequestContext({ familyId: "", inviteCode: testInviteCode, memberId: "" }, async () => {
      const { data, error } = await supabaseClient
        .from("families")
        .insert({ name: `隔離測試 ${testInviteCode}`, invite_code: testInviteCode })
        .select()
        .single();
      if (error) throw error;
      return data;
    });

    testMember = await withRemoteRequestContext({ familyId: testFamily.id, inviteCode: testInviteCode, memberId: "" }, async () => {
      const { data, error } = await supabaseClient
        .from("members")
        .insert({
          family_id: testFamily.id,
          name: "隔離測試員",
          short: avatarOptions[0],
          role: "admin",
          health: "😐",
          note: "權限測試",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    });

    await withRemoteRequestContext({ familyId: testFamily.id, inviteCode: testInviteCode, memberId: testMember.id }, async () => {
      const [{ error: taskError }, { error: messageError }] = await Promise.all([
        supabaseClient.from("tasks").insert({
          family_id: testFamily.id,
          title: "隔離任務",
          owner: "隔離測試員",
          owner_member_id: testMember.id,
          author: "隔離測試員",
          author_member_id: testMember.id,
          time_label: "今天",
          due_date: todayISO(),
          done: false,
        }),
        supabaseClient.from("messages").insert({
          family_id: testFamily.id,
          actor: "隔離測試員",
          actor_member_id: testMember.id,
          text: "隔離聊天",
          type: "normal",
        }),
      ]);
      if (taskError || messageError) throw taskError || messageError;
    });

    setSecurityTestStatus("正在嘗試跨家庭讀取...");
    const currentContext = {
      familyId,
      inviteCode: state.inviteCode,
      memberId: currentMemberId(),
      deviceId: currentDeviceId(),
    };
    const [memberProbe, taskProbe, messageProbe] = await withRemoteRequestContext(currentContext, async () =>
      Promise.all([
        supabaseClient.from("members").select("id").eq("family_id", testFamily.id),
        supabaseClient.from("tasks").select("id").eq("family_id", testFamily.id),
        supabaseClient.from("messages").select("id").eq("family_id", testFamily.id),
      ]),
    );
    const probeError = [memberProbe, taskProbe, messageProbe].find((result) => result.error)?.error;
    if (probeError) throw probeError;
    const leakedRows = [memberProbe, taskProbe, messageProbe].reduce((sum, result) => sum + (result.data?.length || 0), 0);
    setSecurityTestStatus(leakedRows === 0 ? "通過：目前家庭讀不到隔離家庭資料。" : `未通過：讀到 ${leakedRows} 筆隔離資料。`);
  } catch (error) {
    setSecurityTestStatus(`測試失敗：${error.message || "請稍後再試"}`);
    console.warn("Security isolation test failed", error);
  } finally {
    if (testFamily && testMember) {
      await withRemoteRequestContext({ familyId: testFamily.id, inviteCode: testInviteCode, memberId: testMember.id }, async () => {
        await supabaseClient.from("families").delete().eq("id", testFamily.id);
      });
    }
    securityIsolationTestButton.disabled = false;
  }
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
    if (document.visibilityState === "visible") loadRemoteData(!isScreenActive("add"));
  }, 10000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadRemoteData(!isScreenActive("add"));
});

window.addEventListener("focus", () => loadRemoteData(!isScreenActive("add")));

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
  const payload = {
    title: task.title,
    owner: task.owner,
    owner_member_id: task.ownerId || null,
    author: task.author,
    author_member_id: task.authorId || null,
    time_label: task.time,
    due_date: normalizeDateValue(task.dueDate),
    done: task.done,
    last_completed_date: normalizeDateValue(task.lastCompletedDate) || null,
  };
  let result = await supabaseClient
    .from("tasks")
    .update(payload)
    .eq("id", task.id);
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabaseClient
      .from("tasks")
      .update(withoutIdColumns(payload, ["owner_member_id", "author_member_id"]))
      .eq("id", task.id);
  }
  const { error } = result;
  if (error) setSyncError("Task update sync failed", error);
  else await loadRemoteData(false);
}

async function updateRemoteMember(member) {
  if (!remoteReady || !familyId) return;
  const payload = {
    name: member.name,
    health: member.health,
    note: member.note,
    short: member.short,
    role: member.role || (member.name === state.currentUser ? "admin" : "member"),
  };
  if (member.memberCode) payload.member_code = member.memberCode;
  if (member.deviceId) payload.device_id = member.deviceId;
  const query = supabaseClient.from("members").update(payload).eq("family_id", familyId);
  const { error } = member.id ? await query.eq("id", member.id) : await query.eq("name", member.name);
  if (error && isMissingColumnError(error) && payload.member_code) {
    delete payload.member_code;
    const retryQuery = supabaseClient.from("members").update(payload).eq("family_id", familyId);
    const retry = member.id ? await retryQuery.eq("id", member.id) : await retryQuery.eq("name", member.name);
    if (retry.error) setSyncError("Member update sync failed", retry.error);
    else await loadRemoteData(false);
    return;
  }
  if (error && payload.device_id) {
    delete payload.device_id;
    const retryQuery = supabaseClient.from("members").update(payload).eq("family_id", familyId);
    const retry = member.id ? await retryQuery.eq("id", member.id) : await retryQuery.eq("name", member.name);
    if (retry.error) setSyncError("Member update sync failed", retry.error);
    else await loadRemoteData(false);
    return;
  }
  if (error) setSyncError("Member update sync failed", error);
  else await loadRemoteData(false);
}

async function updateRemoteMemberDevice(member) {
  if (!remoteReady || !familyId || !member.id) return;
  const { error } = await supabaseClient
    .from("members")
    .update({ device_id: member.deviceId })
    .eq("family_id", familyId)
    .eq("id", member.id);
  if (error) console.warn("Member device sync failed", error);
  else await loadRemoteData(false);
}

async function insertRemoteMember(member, { bindDevice = true } = {}) {
  if (!remoteReady || !familyId) return;
  const payload = {
    family_id: familyId,
    name: member.name,
    short: member.short,
    role: member.role || "member",
    health: member.health,
    note: member.note,
    member_code: member.memberCode || generateMemberCode(),
  };
  if (bindDevice) payload.device_id = member.deviceId || currentDeviceId();
  let result = await supabaseClient.from("members").insert(payload).select().single();
  if (result.error && isMissingColumnError(result.error)) {
    delete payload.member_code;
    result = await supabaseClient.from("members").insert(payload).select().single();
  }
  if (result.error && payload.device_id) {
    delete payload.device_id;
    result = await supabaseClient.from("members").insert(payload).select().single();
  }
  if (result.error) {
    setSyncError("Member insert sync failed", result.error);
    return null;
  }
  await loadRemoteData(false);
  return fromRemoteMember(result.data);
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
  return addDaysToISO(familyTodayISO(), state.dateOffsetDays || 0);
}

function currentDate() {
  const date = familyDateFromISO(todayISO());
  const parts = currentZonedDateParts();
  date.setHours(parts.hour, parts.minute, parts.second, 0);
  return date;
}

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value) {
  if (!value) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : localISODate(value);
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replaceAll("/", "-");
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDate) return isoDate[1];
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : localISODate(date);
}

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function normalizeTimezone(value) {
  const timezone = value || browserTimezone();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
}

function ensureTimezoneOption(timezone) {
  if (!familyTimezoneSelect || !timezone) return;
  if ([...familyTimezoneSelect.options].some((option) => option.value === timezone)) return;
  const option = document.createElement("option");
  option.value = timezone;
  option.textContent = timezone;
  familyTimezoneSelect.append(option);
}

function timezoneLabel(timezone) {
  const map = {
    "Asia/Taipei": "台灣時間",
    "America/Los_Angeles": "美西時間",
    "America/New_York": "美東時間",
    "UTC": "UTC",
  };
  return map[timezone] || timezone;
}

function currentZonedDateParts(baseDate = new Date()) {
  return zonedDateParts(addDays(baseDate, state.dateOffsetDays || 0), state.familyTimezone);
}

function zonedDateParts(date, timezone = state.familyTimezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function familyTodayISO() {
  const parts = zonedDateParts(new Date(), state.familyTimezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function familyDateFromISO(value) {
  const [year, month, day] = (normalizeDateValue(value) || familyTodayISO()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysToISO(value, days) {
  return localISODate(addDays(familyDateFromISO(value), days));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function scheduleFromTime(time) {
  if (time === "每天") return { dueDate: todayISO(), repeat: "daily" };
  if (time === "明天") return { dueDate: addDaysToISO(todayISO(), 1), repeat: null };
  if (time === "週末") return { dueDate: nextWeekendISO(), repeat: null };
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(time)) return { dueDate: time.replaceAll("/", "-"), repeat: null };
  return { dueDate: todayISO(), repeat: null };
}

function nextWeekendISO() {
  const date = familyDateFromISO(todayISO());
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  return localISODate(addDays(date, daysUntilSaturday));
}

function taskDueDate(task) {
  return normalizeDateValue(task.dueDate) || scheduleFromTime(task.time).dueDate;
}

function compareTaskDate(a, b) {
  return taskDueDate(a).localeCompare(taskDueDate(b)) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
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
  if (dueDate === addDaysToISO(todayISO(), 1)) return "明天";
  return dueDate.replaceAll("-", "/");
}

function heroImageForNow() {
  if (state.heroMode === "day") return "assets/icons/Hero Banner/白天.png";
  if (state.heroMode === "night") return "assets/icons/Hero Banner/晚上.png";
  if (state.heroMode === "rain") return "assets/icons/Hero Banner/雨天.png";
  if (state.weatherMode === "rain") return "assets/icons/Hero Banner/雨天.png";
  const hour = currentZonedDateParts().hour;
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
    short: avatarOptions[state.members.length % avatarOptions.length],
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

function openDeleteMemberConfirm(name) {
  pendingDeleteMemberName = name;
  deleteMemberTitle.textContent = `確定移除「${name}」？`;
  deleteMemberMessage.textContent = "移除後對方會從家人列表消失，指派給他的任務也會一起移除。";
  deleteMemberConfirm.classList.add("active");
  deleteMemberConfirm.setAttribute("aria-hidden", "false");
}

function closeDeleteMemberConfirm() {
  pendingDeleteMemberName = null;
  deleteMemberConfirm.classList.remove("active");
  deleteMemberConfirm.setAttribute("aria-hidden", "true");
}

async function deletePendingMember() {
  const name = pendingDeleteMemberName;
  if (!name || state.role !== "admin" || name === state.currentUser) {
    closeDeleteMemberConfirm();
    return;
  }
  const member = state.members.find((item) => item.name === name);
  const memberId = member?.id || "";
  state.members = state.members.filter((item) => item.name !== name);
  state.tasks = state.tasks.filter((task) => !(task.owner === name || (memberId && sameId(task.ownerId, memberId))));
  if (remoteReady && familyId) {
    const memberQuery = supabaseClient.from("members").delete().eq("family_id", familyId);
    const taskByName = supabaseClient.from("tasks").delete().eq("family_id", familyId).eq("owner", name);
    const pushByName = supabaseClient.from("push_subscriptions").delete().eq("family_id", familyId).eq("member_name", name);
    const nativePushByName = supabaseClient.from("native_push_tokens").delete().eq("family_id", familyId).eq("member_name", name);
    const remoteDeletes = [
      memberId ? memberQuery.eq("id", memberId) : memberQuery.eq("name", name),
      taskByName,
      pushByName,
      nativePushByName,
    ];
    if (memberId) {
      remoteDeletes.push(supabaseClient.from("tasks").delete().eq("family_id", familyId).eq("owner_member_id", memberId));
      remoteDeletes.push(supabaseClient.from("push_subscriptions").delete().eq("family_id", familyId).eq("member_id", memberId));
      remoteDeletes.push(supabaseClient.from("native_push_tokens").delete().eq("family_id", familyId).eq("member_id", memberId));
    }
    const results = await Promise.all(remoteDeletes);
    const deleteError = results.find((result) => result.error && !isMissingColumnError(result.error))?.error;
    if (deleteError) setSyncError("Member delete sync failed", deleteError);
  }
  addFeed(`移除成員：${name}`);
  markSynced();
  closeDeleteMemberConfirm();
  render();
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

  const avatarButton = event.target.closest("[data-edit-avatar]");
  if (avatarButton) {
    showAvatarPicker(avatarButton.dataset.editAvatar);
    return;
  }

  const avatarChoice = event.target.closest("[data-avatar-choice]");
  if (avatarChoice) {
    const member = state.members.find((item) => item.name === pendingAvatarMemberName);
    if (!member || !canEditMemberAvatar(member)) return;
    member.short = avatarChoice.dataset.avatarChoice;
    await updateRemoteMember(member);
    hideAvatarPicker();
    render();
    return;
  }

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

  const taskFilterButton = event.target.closest("[data-task-filter]");
  if (taskFilterButton) {
    state.adminTaskFilter = taskFilterButton.dataset.taskFilter;
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
    if (item && canDelete(item.actor, item.actorId)) {
      state.feed = state.feed.filter((feed) => !sameId(feed.id, id));
      await deleteRemoteMessage(id);
      render();
    }
  }

  const deleteChatButton = event.target.closest("[data-delete-chat]");
  if (deleteChatButton) {
    const id = deleteChatButton.dataset.deleteChat;
    const item = state.chat.find((chat) => sameId(chat.id, id));
    if (item && canDelete(item.actor, item.actorId)) {
      state.chat = state.chat.filter((chat) => !sameId(chat.id, id));
      await deleteRemoteMessage(id);
      render();
    }
  }

  const deleteMemberButton = event.target.closest("[data-delete-member]");
  if (deleteMemberButton && state.role === "admin") {
    const name = deleteMemberButton.dataset.deleteMember;
    if (name !== state.currentUser) {
      openDeleteMemberConfirm(name);
    }
  }

  const adminMemberButton = event.target.closest("[data-admin-member]");
  if (adminMemberButton && state.role === "admin") {
    showMemberAdmin(adminMemberButton.dataset.adminMember, adminMemberButton.dataset.adminMemberName);
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
    const checkin = {
      from: state.currentUser,
      target,
      question,
    };
    state.pendingCheckin = canAnswerCheckin(checkin) ? checkin : null;
    addFeed(`詢問 ${target === "all" ? "大家" : target}：${question}`);
    addChat(`問 ${target === "all" ? "大家" : target}：${question}`, "checkin");
    notifyFamilyEvent({
      kind: "checkin",
      question,
      target,
      actorName: state.currentUser,
      actorMember: currentMember(),
    });
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

document.querySelector("#deleteMemberCancelButton").addEventListener("click", closeDeleteMemberConfirm);

document.querySelector("#deleteMemberConfirmButton").addEventListener("click", deletePendingMember);

document.querySelector("#deleteFamilyCancelButton").addEventListener("click", closeDeleteFamilyConfirm);

document.querySelector("#deleteFamilyConfirmButton").addEventListener("click", deleteCurrentFamily);

document.querySelector("#cleanupOldDataCancelButton").addEventListener("click", closeCleanupOldDataConfirm);

document.querySelector("#cleanupOldDataConfirmButton").addEventListener("click", () => {
  cleanupOldData().catch((error) => {
    setVersionStatus("清理失敗，請稍後再試", "error");
    console.warn("Old data cleanup failed", error);
  });
});

document.querySelector("#avatarCloseButton").addEventListener("click", hideAvatarPicker);

avatarLayer.addEventListener("click", (event) => {
  if (event.target === avatarLayer) hideAvatarPicker();
});

document.querySelector("#memberAdminCloseButton").addEventListener("click", hideMemberAdmin);

memberAdminLayer.addEventListener("click", (event) => {
  if (event.target === memberAdminLayer) hideMemberAdmin();
});

document.querySelector("#saveMemberAdminNameButton").addEventListener("click", () => {
  saveAdminMemberName().catch((error) => {
    setMemberAdminStatus("名字儲存失敗，請稍後再試。");
    console.warn("Admin member rename failed", error);
  });
});

memberAdminNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#saveMemberAdminNameButton").click();
});

resetMemberDeviceButton.addEventListener("click", () => {
  resetAdminMemberDevice().catch((error) => {
    setMemberAdminStatus("重設失敗，請稍後再試。");
    console.warn("Member device reset failed", error);
  });
});

copyMemberLinkButton.addEventListener("click", () => {
  copyMemberInviteLink().catch((error) => {
    setMemberAdminStatus("身份連結複製失敗，請稍後再試。");
    console.warn("Member link copy failed", error);
  });
});

regenerateMemberCodeButton.addEventListener("click", () => {
  regenerateMemberInviteLink().catch((error) => {
    setMemberAdminStatus("身份連結產生失敗，請稍後再試。");
    console.warn("Member link regenerate failed", error);
  });
});

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
  notifyFamilyEvent({
    kind: "emergency",
    actorName: state.currentUser,
    actorMember: member,
  });
  markSynced();
  render();
  switchScreen("chat");
});

document.querySelector("#createFamilyButton").addEventListener("click", () => {
  createFamily().catch((error) => {
    console.warn("Create family failed", error);
    setSetupStatus("建立失敗，請稍後再試。");
  });
});

document.querySelector("#joinFamilyButton").addEventListener("click", () => {
  joinFamily().catch((error) => {
    console.warn("Join family failed", error);
    setSetupStatus("加入失敗，請稍後再試。");
  });
});

joinCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#joinFamilyButton").click();
});

setupFamilyNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#createFamilyButton").click();
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
    short: avatarOptions[(index - 1) % avatarOptions.length],
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

createMemberInviteButton.addEventListener("click", () => {
  createMemberInvite().catch((error) => {
    memberInviteStatusText.textContent = "產生失敗，請稍後再試。";
    setSyncError("Create member invite failed", error);
  });
});

inviteMemberNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createMemberInviteButton.click();
});

document.querySelector("#simulateJoinButton").addEventListener("click", async () => {
  addInvitedMember();
  await refreshRemoteSoon();
  render();
});

resetDemoButton.addEventListener("click", async () => {
  if (!canResetDemoData()) return;
  const activeFamily = {
    id: familyId,
    name: state.familyName,
    inviteCode: state.inviteCode,
  };
  state = structuredClone(initialState);
  familyId = activeFamily.id;
  state.familyName = activeFamily.name;
  state.inviteCode = activeFamily.inviteCode;
  await resetRemoteDemo();
  render();
  switchScreen("today");
});

clearDemoButton.addEventListener("click", async () => {
  if (!canResetDemoData()) return;
  clearExamples();
  await clearRemoteExamples();
  render();
  switchScreen("today");
});

cleanupOldDataButton.addEventListener("click", openCleanupOldDataConfirm);

addDemoTaskButton.addEventListener("click", async () => {
  if (!canRunDataTool()) return;
  const random = templates[Math.floor(Math.random() * templates.length)];
  await addTask(random.title, state.members[Math.floor(Math.random() * state.members.length)].name, "今天");
  render();
});

securityIsolationTestButton.addEventListener("click", () => {
  runSecurityIsolationTest();
});

document.querySelector("#saveFamilyNameButton").addEventListener("click", () => {
  saveFamilyName().catch((error) => {
    familyManageStatusText.textContent = "儲存失敗，請稍後再試。";
    console.warn("Family name save failed", error);
  });
});

document.querySelector("#saveProfileNameButton").addEventListener("click", () => {
  saveProfileName().catch((error) => {
    setProfileManageStatus("名字儲存失敗，請稍後再試。");
    console.warn("Profile name save failed", error);
  });
});

profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#saveProfileNameButton").click();
});

familyNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#saveFamilyNameButton").click();
});

document.querySelector("#deleteFamilyButton").addEventListener("click", openDeleteFamilyConfirm);

document.querySelector("#checkUpdateButton").addEventListener("click", () => checkForAppUpdate());

versionStatusText?.addEventListener("click", handleVersionTap);

maintenanceToggleButton.addEventListener("click", () => {
  if (state.role !== "admin") return;
  maintenanceOpen = !maintenanceOpen;
  render();
});

document.querySelectorAll("[data-legal-doc]").forEach((button) => {
  button.addEventListener("click", () => openLegalDocument(button.dataset.legalDoc));
});

document.querySelector("#legalDocCloseButton").addEventListener("click", closeLegalDocument);

legalDocLayer?.addEventListener("click", (event) => {
  if (event.target === legalDocLayer) closeLegalDocument();
});

updateNowButton.addEventListener("click", applyAppUpdate);

applyRuntimeClasses();
initSoundSetting();
currentDeviceId();
applySavedIdentity();
render();
initRemote().then(async () => {
  await initNativePushIfEnabled();
  render();
});

if (!isNativeApp() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => {
        registration.update();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdateToast();
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      })
      .finally(() => {
        checkForAppUpdate({ silent: true });
      });
  });
} else {
  checkForAppUpdate({ silent: true });
}
