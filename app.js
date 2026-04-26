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
    .replace(/"/g, "&quot;")
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
  return conversations.find((conversation) => conversation.id === activeConversationId) || null;
}

function sortConversationsByRecent() {
  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
}

function saveConversations() {
  sortConversationsByRecent();
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations.slice(0, MAX_STORED_CONVERSATIONS)));
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
    const firstConversation = createConversation();
    conversations = [firstConversation];
    activeConversationId = firstConversation.id;
    saveConversations();
    return;
  }

  conversations = parsed
    .filter((conversation) => conversation && Array.isArray(conversation.messages))
    .map((conversation) => ({
      id: conversation.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: conversation.title || "New chat",
      updatedAt: conversation.updatedAt || Date.now(),
      messages: conversation.messages.filter((message) => message && (message.sender === "user" || message.sender === "bot")),
    }));

  sortConversationsByRecent();

  const storedActiveId = localStorage.getItem(STORAGE_KEYS.activeConversationId);
  const activeExists = conversations.some((conversation) => conversation.id === storedActiveId);
  activeConversationId = activeExists ? storedActiveId : conversations[0].id;
  saveConversations();
}

function renderConversation(conversation) {
  chatWindow.innerHTML = "";
  conversation.messages.forEach((message) => {
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

function setActiveConversation(conversationId, focusInput = true) {
  activeConversationId = conversationId;
  const conversation = getActiveConversation();
  if (!conversation) return;
  renderConversation(conversation);
  renderRecentChats();
  saveConversations();
  if (focusInput) chatInput.focus();
}

function deleteConversation(conversationId) {
  conversations = conversations.filter((conversation) => conversation.id !== conversationId);

  if (conversations.length === 0) {
    const replacement = createConversation();
    conversations = [replacement];
    activeConversationId = replacement.id;
  } else if (activeConversationId === conversationId) {
    sortConversationsByRecent();
    activeConversationId = conversations[0].id;
  }

  saveConversations();
  setActiveConversation(activeConversationId, false);
}

function renderRecentChats() {
  if (!recentChatsList) return;
  recentChatsList.innerHTML = "";

  if (conversations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No recent chats yet.";
    recentChatsList.appendChild(empty);
    return;
  }

  sortConversationsByRecent();
  conversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "recent-chat-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-chat-item";
    if (conversation.id === activeConversationId) {
      button.classList.add("active");
    }
    button.innerHTML = `<span>${escapeHtml(conversation.title)}</span>`;
    button.addEventListener("click", () => setActiveConversation(conversation.id, true));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "recent-chat-delete";
    deleteBtn.setAttribute("aria-label", `Delete chat: ${conversation.title}`);
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteConversation(conversation.id);
    });

    row.appendChild(button);
    row.appendChild(deleteBtn);
    recentChatsList.appendChild(row);
  });
}

function appendMessage(text, sender = "bot", options = {}) {
  const { persist = true } = options;
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

  if (!persist) return;
  const conversation = getActiveConversation();
  if (!conversation) return;

  conversation.messages.push({ sender, html: text });
  conversation.updatedAt = Date.now();
  if (sender === "user" && conversation.title === "New chat") {
    conversation.title = truncateTitle(text);
  }
  saveConversations();
  renderRecentChats();
}

function startNewChat() {
  const conversation = createConversation();
  conversations.unshift(conversation);
  if (conversations.length > MAX_STORED_CONVERSATIONS) {
    conversations = conversations.slice(0, MAX_STORED_CONVERSATIONS);
  }
  setActiveConversation(conversation.id, true);
  chatInput.value = "";
}

function formatBotReply(rawText) {
  if (!rawText) return "";

  const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const knownLabels = ["Ingredients", "Steps", "Difficulty", "Tips"];

  const formatted = lines.map((line) => {
    const parts = line.split(":");
    if (parts.length > 1) {
      const label = parts[0].trim();
      const rest = parts.slice(1).join(":").trim();
      if (knownLabels.includes(label)) {
        if (label === "Steps") {
          const prettySteps = rest
            .replace(/\s+/g, " ")
            .replace(/(\d+\.)\s*/g, "<br />$1 ")
            .replace(/^<br\s*\/?>\s*/i, "");
          return `<strong>${label}:</strong> ${prettySteps}`;
        }

        return `<strong>${label}:</strong> ${rest}`;
      }
    }
    return line;
  });
  return formatted.join("<br /><br />");
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
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);

  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return row;
}

function generateMockReply(prompt) {
  return `
    Here’s a beginner‑friendly idea based on what you asked:
    <br /><br />
    <strong>1. Quick summary</strong><br />
    I’ll keep the recipe to a few clear steps with simple ingredients.
    <br /><br />
    <strong>2. Suggested direction</strong><br />
    • Choose a basic cooking method (like sautéing or baking).<br />
    • Use ingredients you already have and season with salt, pepper, and one herb or spice.<br />
    • We’ll plate it simply so it still feels “restaurant‑style”.
    <br /><br />
    When you connect me to your real TasteBot backend, this message will be replaced by live recipe recommendations.
  `;
}

async function handleUserMessage(message) {
  if (!message.trim()) return;

  appendMessage(message, "user");
  chatInput.value = "";

  const typingRow = appendTypingIndicator();

  try {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    typingRow.remove();

    const reply = data.reply || "Sorry, I could not generate a reply.";
    const formatted = formatBotReply(reply);
    appendMessage(formatted, "bot");
  } catch (error) {
    typingRow.remove();
    appendMessage(
      "Sorry, I had trouble reaching the TasteBot server. Please check if the Python server is running.",
      "bot",
    );
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleUserMessage(chatInput.value);
});

if (newChatBtn) {
  newChatBtn.addEventListener("click", startNewChat);
}

loadConversations();
setActiveConversation(activeConversationId, false);

