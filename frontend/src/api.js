/**
 * API client for NexusChat backend.
 */

const API_BASE = '/api';

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return (await res.json()).models;
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return (await res.json()).conversations;
}

export async function fetchConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error('Conversation not found');
  return (await res.json()).conversation;
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return true;
}

export async function renameConversation(id, title) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to rename');
  return true;
}

export async function clearAllConversations() {
  const res = await fetch(`${API_BASE}/conversations`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear');
  return true;
}

/**
 * Sends a chat message and returns a streaming reader via SSE.
 * Calls `onToken(token)` for each streamed token, `onMeta(meta)` for metadata,
 * `onDone(data)` when complete, `onError(err)` on error.
 */
export function sendMessageStream({ conversationId, message, model, systemPrompt, onToken, onMeta, onDone, onError }) {
  const controller = new AbortController();

  const body = {
    conversation_id: conversationId || null,
    message,
    model,
    system_prompt: systemPrompt,
    stream: true,
  };

  fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.text();
        onError?.(err);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7).trim();
            // Next data line
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              // Determine event type from previous event line
              if (data.token !== undefined) {
                onToken?.(data.token);
              } else if (data.conversation_id !== undefined && !data.token) {
                // Could be meta or done
                if (data.error) {
                  onError?.(data.error);
                } else {
                  onMeta?.(data);
                }
              } else if (data.error) {
                onError?.(data.error);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      onDone?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message);
      }
    });

  return controller;
}
