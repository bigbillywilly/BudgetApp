// server/src/models/User.ts
// User model for authentication and profile management
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new user
export interface CreateUserData {
  email: string;
  name: string;
  password_hash: string;
  email_verification_token?: string;
}

// DTO for updating user fields (partial update)
export interface UpdateUserData {
  name?: string;
  email_verified?: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login?: Date;
}