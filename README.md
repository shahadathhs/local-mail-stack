# Local Mail Stack

📧 **Local Mail Server (SMTP + IMAP) for Development & Testing**

## One-liner

A fully local email system that supports sending, receiving, storing, and reading emails using real SMTP and IMAP protocols — built for developers to test email flows without external services.

## 🎯 Problem This Solves

Developers usually rely on:

- **Gmail** (slow, unsafe for testing)
- **Third-party tools** (Mailtrap, Ethereal)

This project:

- Runs 100% locally
- Uses real protocols
- Gives full control + visibility
- Great for backend email testing (password reset, notifications, etc.)

## 🧱 Core Stack

| Layer             | Tech                |
| :---------------- | :------------------ |
| **SMTP Server**   | `smtp-server`       |
| **Email Sending** | `nodemailer`        |
| **Email Parsing** | `mailparser`        |
| **IMAP Server**   | `ImapFlow`          |
| **Backend API**   | Node.js / NestJS    |
| **Storage**       | SQLite / PostgreSQL |
| **UI (optional)** | React / Next.js     |
| **Deployment**    | Docker              |

## 🧩 High-Level Architecture

```text
┌────────────┐
│ App / API  │
│ (Nodemailer)
└─────┬──────┘
      │ SMTP
      ▼
┌──────────────┐
│ SMTP Server  │ (smtp-server)
└─────┬────────┘
      │ raw email
      ▼
┌──────────────┐
│ Mail Parser  │ (mailparser)
└─────┬────────┘
      │ parsed email
      ▼
┌──────────────┐
│  Database    │
│  (Emails)    │
└─────┬────────┘
      │ IMAP
      ▼
┌──────────────┐
│ IMAP Server  │ (ImapFlow)
└─────┬────────┘
      │
      ▼
┌──────────────┐
│ Mail Client  │
│  / Web UI    │
└──────────────┘
```

## 🔁 Email Flow (End-to-End)

1. **Sending Email**
   - App uses `Nodemailer`
   - Connects to `localhost:2525`
   - Sends email via SMTP
2. **Receiving Email**
   - `smtp-server` receives raw email
   - Passes stream to `mailparser`
   - Extracts: `From` / `To`, `Subject`, `Text` / `HTML`, `Attachments`
3. **Storage**
   - Emails stored in DB
   - Attachments saved to filesystem
   - Mailboxes: `INBOX`, `Sent`, `Drafts`
4. **Reading Email**
   - IMAP server exposes mailboxes
   - Email clients (or UI) connect via IMAP
   - Read, search, mark read/unread

## ✨ Core Features (MVP)

### SMTP

- Accept incoming emails
- Support multiple recipients
- Handle attachments
- Optional SMTP AUTH

### IMAP

- `INBOX` support
- Fetch emails
- Flags (`Seen`, `Unread`)
- Pagination

### Backend

- Email persistence
- Mailbox management
- User accounts (local users)

## 🚀 Advanced Features (Phase 2)

- STARTTLS (self-signed)
- SMTP AUTH (LOGIN / PLAIN)
- Multiple users & mailboxes
- IMAP IDLE (live updates)
- Web UI Inbox
- Search (subject/body)
- Export `.eml`

## 🔒 Security Scope (Intentionally Limited)

This project is local-only by design:

- No public email sending
- No DKIM / SPF / DMARC
- No spam filtering
- No open relay

## 📁 Suggested Project Structure

```text
mail-server/
├── smtp/
│   └── smtp.server.ts
├── imap/
│   └── imap.server.ts
├── parser/
│   └── mail.parser.ts
├── storage/
│   ├── email.repository.ts
│   └── attachment.store.ts
├── api/
│   └── mail.controller.ts
├── ui/
│   └── inbox/
├── docker-compose.yml
└── README.md
```

## 🏷️ Resume-Ready Description

> Built a local email server supporting SMTP and IMAP protocols using Node.js. Implemented email parsing, storage, and mailbox access using `Nodemailer`, `smtp-server`, `mailparser`, and `ImapFlow`. Designed for local development and testing of transactional email workflows.

---

### ✅ Final Check

- `nodemailer` → client (send emails)
- `smtp-server` → receive emails
- `mailparser` → parse raw emails
- `ImapFlow` → read emails via IMAP

_This is a real mail system, not a mock._
