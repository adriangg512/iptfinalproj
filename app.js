// FIXED TasteBot app.js

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const recentChatsList = document.getElementById("recent-chats-list");
const newChatBtn = document.getElementById("new-chat-btn");

const STORAGE_KEYS = {
  conversations: "tastebot_conversations_v2",
  activeConversationId: "tastebot_active_conversation_v2",
};

const MAX_STORED_CONVERSATIONS = 30;
const INITIAL_BOT_MESSAGE_HTML =
  "Hi, I’m <strong>TasteBot</strong> - your beginner-friendly cooking guide. " +
  "Tell me what ingredients you have or what you’d like to learn and I’ll walk you through a simple recipe step by step.";

let conversations = [];
let activeConversationId = null;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateTitle(text, maxLength = 42) {
  const normalized = String(text || "").trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized || "New chat";
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function createConversation() {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: "New chat",
    updatedAt: now,
    messages: [{ sender: "bot", html: INITIAL_BOT_MESSAGE_HTML }],
  };
}

function getActiveConversation() {
  return conversations.find(c => c.id === activeConversationId) || null;
}

function sortConversationsByRecent() {
  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
}

function saveConversations() {
  sortConversationsByRecent();
  localStorage.setItem(
    STORAGE_KEYS.conversations,
    JSON.stringify(conversations.slice(0, MAX_STORED_CONVERSATIONS))
  );
  localStorage.setItem(STORAGE_KEYS.activeConversationId, activeConversationId || "");
}

function loadConversations() {
  const raw = localStorage.getItem(STORAGE_KEYS.conversations);
  let parsed = [];

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    const first = createConversation();
    conversations = [first];
    activeConversationId = first.id;
    saveConversations();
    return;
  }

  conversations = parsed.map(c => ({
    id: c.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: c.title || "New chat",
    updatedAt: c.updatedAt || Date.now(),
    messages: (c.messages || []).filter(m => m.sender === "user" || m.sender === "bot"),
  }));

  sortConversationsByRecent();

  const stored = localStorage.getItem(STORAGE_KEYS.activeConversationId);
  activeConversationId = conversations.find(c => c.id === stored)
    ? stored
    : conversations[0].id;

  saveConversations();
}

function renderConversation(conversation) {
  chatWindow.innerHTML = "";

  conversation.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = `message-row ${message.sender}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${message.sender === "bot" ? "bot-avatar" : "user-avatar"}`;
    avatar.textContent = message.sender === "bot" ? "T" : "U";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<p>${message.html || ""}</p>`;

    if (message.sender === "user") {
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
    }

    chatWindow.appendChild(row);
  });

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setActiveConversation(id, focus = true) {
  activeConversationId = id;
  const conv = getActiveConversation();
  if (!conv) return;

  renderConversation(conv);
  renderRecentChats();
  saveConversations();
  if (focus) chatInput.focus();
}

function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);

  if (conversations.length === 0) {
    const fresh = createConversation();
    conversations = [fresh];
    activeConversationId = fresh.id;
  } else if (activeConversationId === id) {
    sortConversationsByRecent();
    activeConversationId = conversations[0].id;
  }

  saveConversations();
  setActiveConversation(activeConversationId, false);
}

function renderRecentChats() {
  if (!recentChatsList) return;
  recentChatsList.innerHTML = "";

  sortConversationsByRecent();

  conversations.forEach(c => {
    const row = document.createElement("div");
    row.className = "recent-chat-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recent-chat-item";

    if (c.id === activeConversationId) btn.classList.add("active");

    btn.innerHTML = `<span>${escapeHtml(c.title)}</span>`;
    btn.onclick = () => setActiveConversation(c.id);

    const del = document.createElement("button");
    del.className = "recent-chat-delete";
    del.textContent = "×";
    del.setAttribute("aria-label", `Delete chat: ${c.title}`);

    del.onclick = (e) => {
      e.stopPropagation();
      deleteConversation(c.id);
    };

    row.appendChild(btn);
    row.appendChild(del);
    recentChatsList.appendChild(row);
  });
}

function appendMessage(text, sender = "bot", options = {}) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${sender === "bot" ? "bot-avatar" : "user-avatar"}`;
  avatar.textContent = sender === "bot" ? "T" : "U";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<p>${text}</p>`;

  if (sender === "user") {
    row.appendChild(bubble);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(bubble);
  }

  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  const conv = getActiveConversation();
  if (!conv) return;

  conv.messages.push({ sender, html: text });
  conv.updatedAt = Date.now();

  if (sender === "user" && conv.title === "New chat") {
    conv.title = truncateTitle(text);
  }

  saveConversations();
  renderRecentChats();
}

function appendTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row bot typing-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar bot-avatar";
  avatar.textContent = "T";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatWindow.appendChild(row);

  return row;
}

async function handleUserMessage(msg) {
  if (!msg.trim()) return;

  appendMessage(msg, "user");
  chatInput.value = "";

  const typing = appendTypingIndicator();

  try {
    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });

    const data = await res.json();
    typing.remove();

    appendMessage(data.reply || "No response.", "bot");
  } catch (e) {
    typing.remove();
    appendMessage("Server not running.", "bot");
  }
}

chatForm.addEventListener("submit", e => {
  e.preventDefault();
  handleUserMessage(chatInput.value);
});

newChatBtn?.addEventListener("click", () => {
  const conv = createConversation();
  conversations.unshift(conv);
  setActiveConversation(conv.id);
  chatInput.value = "";
});

loadConversations();
setActiveConversation(activeConversationId, false);
