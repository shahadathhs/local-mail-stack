# Local Mail Stack

📧 **End-to-End Local Email Environment for Professional Development**

## One-liner

A self-hosted, professional-grade email system that supports sending, receiving, storing, and managing emails using real SMTP and IMAP protocols — featuring a premium Web UI for a complete "Mini Gmail" experience locally.

---

## 🎯 The Ultimate Dev Tool

Stop relying on third-party sandbox services or real Gmail accounts for development. **Local Mail Stack** gives you:

- **100% Privacy**: No data leaves your machine.
- **Protocol Accuracy**: Uses real SMTP (port 1025) and IMAP (port 1143) protocols.
- **Visual Excellence**: A premium, interactive Web UI to monitor and manage your mail flow.
- **Zero Latency**: Instant delivery for testing transactional flows and bulk notifications.

---

## 🧱 Technology Stack

| Layer                 | Tech                                          |
| :-------------------- | :-------------------------------------------- |
| **SMTP Server**       | `smtp-server` (TCP Port 1025)                 |
| **IMAP Server**       | Custom Node.js TCP Implementation (Port 1143) |
| **Web Interface**     | Handlebars + Vanilla CSS (Gmail-inspired)     |
| **Email Parsing**     | `mailparser` (RFC compliant)                  |
| **Backend Framework** | NestJS                                        |
| **Database & ORM**    | PostgreSQL + Prisma                           |
| **Queue Management**  | BullMQ + Redis                                |

---

## 🚀 Key Features

### 📬 Dual-Protocol Support

- **SMTP**: Accept connections from any app. Support for attachments, multiple recipients (To/Cc/Bcc), and raw data streams.
- **IMAP**: Connect your favorite mail client (Thunderbird, Apple Mail). Supports folder listing, fetching, and flag (Read/Unread) updates.

### 🎨 Premium Dev Mailbox (Web UI)

- **"Mini Gmail" Experience**: A state-of-the-art interface with folder navigation, search, and bulk actions.
- **Live Composition**: Compose and send emails directly between local accounts via the Web UI.
- **Powerful Search**: Server-side full-text search across subjects, bodies, and recipients.
- **Action Toolbar**: Archive, Delete, and Mark as Read/Unread with one click.
- **Attachment Preview**: Integrated handling and downloading of email attachments.

### 🛠️ Developer-First Architecture

- **Refactored Module Structure**: Clean separation between `auth` and `web` modules with dedicated services and DTOs.
- **Global Types & Interfaces**: Centralized `@common` layer for shared domain logic.
- **Signed URLs**: Secure access to development mailboxes via cryptographically signed links.

---

## 🔄 How it Works

1.  **Transport**: Your application sends mail via SMTP to `localhost:1025`.
2.  **Ingestion**: `SmtpService` parses the raw stream into structured database records.
3.  **Organization**: `MailboxSetupWorker` ensures users have standard folders (Inbox, Sent, Trash, etc.).
4.  **Access**:
    - **API**: Use the `/dev` endpoints to manage mail programmatically.
    - **Web**: Access the **Local Mail Stack UI** for a visual overview.
    - **IMAP**: Connect an external client to `localhost:1143`.

---

## 🏷️ Resume-Ready Description

> Engineered a comprehensive local email ecosystem using NestJS, featuring custom-built SMTP and IMAP protocol handlers. Developed a high-performance web interface using Handlebars and Vanilla CSS, enabling professional-grade email testing with functional composition, server-side search, and bulk management. Leveraged PostgreSQL for persistent storage and Redis/BullMQ for background mailbox orchestration.

---

### 🚀 Quick Start

```bash
# Start the infrastructure (DB, Redis)
sudo make local-up

# Start the application
pnpm dev
```

_This is a professional mail system, designed for serious developers._
