// server/src/models/ChatMessage.ts
// Chat message model for storing user and assistant interactions
export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  response: string;
  message_type: 'user' | 'assistant'; // Distinguishes sender type
  tokens_used?: number; // Optional: tracks token usage for analytics
  created_at: Date;
}

// DTO for creating a new chat message (id and created_at auto-generated)
export interface CreateChatMessage {
  user_id: string;
  message: string;
  response: string;
  message_type: 'user' | 'assistant';
  tokens_used?: number;
}