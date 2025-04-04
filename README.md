# OwMail - Temporary Email Service

A modern, client-side temporary email web application that uses the [Mail.tm](https://mail.tm) API as its backend. Built with HTML, Vanilla JavaScript, and Tailwind CSS with zero operational expenses.

## Features

- **Multiple Account Management**
  - Create and manage multiple temporary email accounts
  - Switch between accounts easily
  - Secure password generation and storage
  - Automatic authentication token retrieval

- **Real-time Inbox Updates**
  - Automatic polling every 3 seconds for new emails
  - Toast notifications for new messages
  - Read full email content (HTML and text)
  - Delete unwanted emails
  - Reply to emails via mailto: protocol

- **Theme Support**
  - Dark mode (default) and light mode options
  - Theme preference is remembered between sessions
  - Smooth theme transitions

- **Session Persistence**
  - Store email credentials securely in browser localStorage
  - Seamless session restoration on page reload
  - Account removal functionality

- **User Experience**
  - Modern, responsive, mobile-first design
  - Toast notifications for user feedback
  - Intuitive UI with Tailwind CSS styling

## Technologies Used

- **HTML5** - Structure
- **Tailwind CSS** - Styling (via CDN)
- **Vanilla JavaScript** - Client-side logic and API interactions
- **Mail.tm API** - Backend email service

## Setup

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No server or build process required!

## How It Works

1. The application fetches available domains from Mail.tm API
2. User creates an account with desired username and domain
3. Application automatically logs in and stores credentials
4. Inbox displays received messages, which can be opened, read and managed
5. Users can log out or create new email addresses as needed

## API Endpoints Used

- `GET /domains` - Fetch available domains
- `POST /accounts` - Create a new email account
- `POST /token` - Generate authentication token
- `GET /messages` - Fetch inbox messages
- `GET /messages/{id}` - Fetch specific email content
- `DELETE /messages/{id}` - Delete an email

## Security Notes

- Credentials are stored in browser localStorage
- Password visibility can be toggled for user convenience
- HTML content is sanitized to prevent XSS attacks

## CORS Consideration

If you experience CORS issues with direct API calls to Mail.tm, you may need to set up a simple proxy service (like Cloudflare Workers) to relay the requests. The current implementation assumes direct browser-to-API communication is possible.

## License

This project is open source and available for personal and commercial use.
