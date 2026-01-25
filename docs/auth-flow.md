# Authentication Flow

This document outlines the authentication process in the Local Mail Stack, specifically focusing on the Registration and Email Verification flow which utilizes the internal SMTP server.

## 🔄 Registration & Verification Flow

The system uses a seamless, event-driven architecture to handle user registration, mailbox setup, and email delivery entirely within the local environment.

```mermaid
sequenceDiagram
    actor User
    participant API as Auth API
    participant DB as Database
    participant Queue as BullMQ (Mailbox)
    participant Worker as MailboxSetupWorker
    participant SMTP as SMTP Service
    participant LocalSMTP as Internal SMTP (Port 1025)

    %% 1. Registration
    User->>API: POST /auth/register
    API->>DB: Create User (isVerified: false)
    API->>Queue: Emit 'MAILBOX_SETUP' Event
    API->>User: Returns "Verification Email Sent"

    %% 2. Background Mailbox Setup
    Queue->>Worker: Process Job
    Worker->>DB: Create INBOX, Sent, Drafts, etc.

    %% 3. Sending Verification Email
    API->>LocalSMTP: Send Email (Nodemailer)
    Note over API,LocalSMTP: CONNECT localhost:1025

    %% 4. Receiving & Storing Email
    LocalSMTP->>SMTP: onData(stream)
    SMTP->>SMTP: Parse Email (mailparser)
    SMTP->>DB: Find User & INBOX
    SMTP->>DB: Save Email to 'emails' table

    %% 5. Verification
    Note right of User: User checks local Inbox (DB/Client)
    User->>API: POST /auth/verify-otp
    API->>DB: Verify Code
    API->>DB: Update User (isVerified: true)
    API->>User: Returns JWT Token
```

## 🛠️ Components Involved

### 1. Registration Service (`AuthRegisterService`)

- Creates the user record.
- Emits the `MAILBOX_SETUP` event to the `mailbox` queue.
- Generates a 6-digit OTP.
- Uses `AuthMailService` to trigger the email sending.

### 2. Mailbox Setup (`MailboxSetupWorker`)

- Listens to the `mailbox` queue.
- Automatically creates standard folders (`INBOX`, `Sent`, `Drafts`, `Trash`, `Spam`) for the new user.
- Ensures `uidValidity` is set correctly for future IMAP sync.

### 3. Internal SMTP (`SmtpService`)

- Listens on port `1025`.
- Intercepts the verification email sent by `Nodemailer`.
- Parses the email content headers and body.
- Saves the email directly to the recipient's `INBOX` in Postgres.

### 4. OTP Verification (`AuthOtpService`)

- Validates the code provided by the user against the database.
- Marks the user as `isVerified: true`.
- Issues a JWT token for session management.
