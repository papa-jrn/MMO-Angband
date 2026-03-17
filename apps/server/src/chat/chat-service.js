export function createChatMessage({ channel, fromPlayerId, fromName, text }) {
  const normalizedText = normalizeChatText(text);

  return {
    id: createMessageId(),
    channel,
    fromPlayerId,
    fromName,
    text: normalizedText,
    createdAt: new Date().toISOString()
  };
}

function normalizeChatText(text) {
  if (typeof text !== "string") {
    throw new Error("Chat text must be a string");
  }

  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Chat text cannot be empty");
  }

  return trimmed.slice(0, 280);
}

function createMessageId() {
  return `msg_${Date.now()}`;
}
