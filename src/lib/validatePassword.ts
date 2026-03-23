// src/lib/validatePassword.ts
// Shared password validation — used both server-side (auth route) and client-side (UI)

export type PasswordValidation = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8)           errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password))       errors.push("At least one uppercase letter");
  if (!/[0-9]/.test(password))       errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character (!@#$%^&* etc.)");

  return { valid: errors.length === 0, errors };
}

export function passwordStrength(password: string): "weak" | "fair" | "strong" | "excellent" {
  let score = 0;
  if (password.length >= 8)            score++;
  if (password.length >= 12)           score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "strong";
  return "excellent";
}
