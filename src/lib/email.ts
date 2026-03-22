// src/lib/email.ts
// Central email sending utility using Resend.
// All email templates live here — import sendEmail functions into API routes.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "Hubler@endurawill.com";
const APP_NAME = "FamilyTime";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://hubler.vercel.app";

// ─── Shared HTML shell ────────────────────────────────────────────────────────

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin:0; padding:0; background:#FDF8F4; font-family:'Helvetica Neue',Arial,sans-serif; color:#3D2C2C; }
    .wrap { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(100,60,60,0.10); }
    .header { background:linear-gradient(135deg,#E8A5A5,#B5A8D4); padding:32px 36px 24px; text-align:center; }
    .header h1 { margin:0; font-size:26px; color:#fff; font-weight:700; letter-spacing:-0.5px; }
    .header p  { margin:6px 0 0; font-size:14px; color:rgba(255,255,255,0.85); }
    .body  { padding:32px 36px; }
    .body p  { font-size:15px; line-height:1.6; margin:0 0 16px; color:#3D2C2C; }
    .body p.muted { font-size:13px; color:#8B7070; }
    .btn   { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#E8A5A5,#B5A8D4); color:#fff !important; text-decoration:none; border-radius:10px; font-size:15px; font-weight:700; margin:8px 0 20px; }
    .divider { height:1px; background:#EDE0D8; margin:24px 0; }
    .footer { padding:20px 36px; background:#FDF8F4; text-align:center; font-size:12px; color:#B8A8A8; }
    .code  { display:inline-block; background:#F7E6E6; color:#C97B7B; border-radius:8px; padding:10px 20px; font-size:22px; font-weight:800; letter-spacing:4px; margin:8px 0 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🏡 ${APP_NAME}</h1>
      <p>Your family hub</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">${APP_NAME} · This email was sent because someone added you to a family hub.</div>
  </div>
</body>
</html>`;
}

// ─── 1. Member invite ─────────────────────────────────────────────────────────

export async function sendInviteEmail({
  to, firstName, inviteToken, familyName, invitedByName,
}: {
  to: string;
  firstName: string;
  inviteToken: string;
  familyName: string;
  invitedByName: string;
}) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  const html = emailShell(`
    <p>Hi ${firstName},</p>
    <p><strong>${invitedByName}</strong> has invited you to join the <strong>${familyName}</strong> family hub on ${APP_NAME}.</p>
    <p>Click below to create your account and get access:</p>
    <a href="${inviteUrl}" class="btn">Accept Invite →</a>
    <div class="divider"></div>
    <p class="muted">This invite link expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${invitedByName} invited you to join ${familyName} on ${APP_NAME}`,
    html,
  });
}

// ─── 2. Join request approved ─────────────────────────────────────────────────

export async function sendJoinApprovedEmail({
  to, firstName, inviteToken, familyName,
}: {
  to: string;
  firstName: string;
  inviteToken: string;
  familyName: string;
}) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  const html = emailShell(`
    <p>Great news, ${firstName}!</p>
    <p>Your request to join the <strong>${familyName}</strong> family hub has been <strong>approved</strong>.</p>
    <p>Click below to set up your account:</p>
    <a href="${inviteUrl}" class="btn">Join ${familyName} →</a>
    <div class="divider"></div>
    <p class="muted">This link expires in 7 days.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been approved to join ${familyName} on ${APP_NAME}`,
    html,
  });
}

// ─── 3. Join request denied ───────────────────────────────────────────────────

export async function sendJoinDeniedEmail({
  to, firstName, familyName,
}: {
  to: string;
  firstName: string;
  familyName: string;
}) {
  const html = emailShell(`
    <p>Hi ${firstName},</p>
    <p>Unfortunately your request to join the <strong>${familyName}</strong> family hub was not approved at this time.</p>
    <p class="muted">If you think this was a mistake, reach out to the family owner directly.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Update on your request to join ${familyName}`,
    html,
  });
}

// ─── 4. Resend invite ─────────────────────────────────────────────────────────

export async function sendResendInviteEmail({
  to, firstName, inviteToken, familyName,
}: {
  to: string;
  firstName: string;
  inviteToken: string;
  familyName: string;
}) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  const html = emailShell(`
    <p>Hi ${firstName},</p>
    <p>Just a reminder — you have a pending invite to join the <strong>${familyName}</strong> family hub on ${APP_NAME}.</p>
    <a href="${inviteUrl}" class="btn">Accept Invite →</a>
    <div class="divider"></div>
    <p class="muted">This is a new link — any previous invite link is now invalid. Expires in 7 days.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: Your invite to join ${familyName} on ${APP_NAME}`,
    html,
  });
}

// ─── 5. Email verification on signup ─────────────────────────────────────────

export async function sendVerificationEmail({
  to, name, verifyToken,
}: {
  to: string;
  name: string;
  verifyToken: string;
}) {
  const verifyUrl = `${APP_URL}/api/verify-email?token=${verifyToken}`;
  const html = emailShell(`
    <p>Hi ${name},</p>
    <p>Thanks for creating your ${APP_NAME} account. Just one more step — please verify your email address:</p>
    <a href="${verifyUrl}" class="btn">Verify Email →</a>
    <div class="divider"></div>
    <p class="muted">If you didn't create an account, you can safely ignore this email.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Verify your ${APP_NAME} email address`,
    html,
  });
}