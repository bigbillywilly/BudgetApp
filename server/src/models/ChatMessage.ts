// server/src/models/ChatMessage.ts
export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  response: string;
  message_type: 'user' | 'assistant';
  tokens_used?: number;
  created_at: Date;
}

export interface CreateChatMessage {
  user_id: string;
  message: string;
  response: string;
  message_type: 'user' | 'assistant';
  tokens_used?: number;
}