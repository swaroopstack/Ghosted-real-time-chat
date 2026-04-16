# 👻 Ghosted — Real-Time Anonymous Chat

> **Disappear into the conversation.**
>
> Ghosted is a real-time, room-based chat app where users can instantly create or join private rooms and chat with a minimal, atmospheric interface.

[![Live Website](https://img.shields.io/badge/Live-ghostedchat.vercel.app-6d5dfc?style=for-the-badge&logo=vercel&logoColor=white)](https://ghostedchat.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?style=for-the-badge&logo=react&logoColor=black)](client/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-3c873a?style=for-the-badge&logo=node.js&logoColor=white)](server/)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

## 🔗 Live Website

**Production URL:** https://ghostedchat.vercel.app/

---

## ✨ Features

- ⚡ **Instant room creation** with short room IDs
- 🔐 **Anonymous room joining** with custom alias
- 💬 **Real-time messaging** powered by Socket.IO
- 🧨 **Room destroy event** with global room teardown signal
- 🕒 **Built-in session timer** in the chat UI
- 📎 **One-click room ID and invite link copy**
- 🎛️ **Modern cinematic interface** with glitch/noise effects and toast notifications

---

## 🧱 Tech Stack

### Frontend
- **React 19**
- **Vite 8**
- **React Router 7**
- **Socket.IO Client**
- **Tailwind CSS** (configured)

### Backend
- **Node.js**
- **Express 5**
- **Socket.IO**
- **MongoDB + Mongoose**
- **dotenv + CORS**

### Deployment
- **Vercel** (frontend)
- **Node runtime backend** (with environment-based port and Mongo URI)

---

## 🗂️ Project Structure

```bash
Ghosted-real-time-chat/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── Home.jsx        # Landing + create/join flow
│   │   ├── Chat.jsx        # Real-time chat room UI
│   │   └── App.jsx         # Routes
│   └── package.json
├── server/                 # Express + Socket.IO backend
│   ├── routes/roomRoutes.js
│   ├── socket/socket.js
│   ├── models/Room.js
│   ├── server.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### 1) Clone the repository

```bash
git clone https://github.com/swaroopstack/Ghosted-real-time-chat.git
cd Ghosted-real-time-chat
```

### 2) Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 3) Configure environment variables

Create a `.env` file inside `server/`:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

Create a `.env` file inside `client/`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

### 4) Run backend

```bash
cd server
npm run dev
```

### 5) Run frontend

```bash
cd client
npm run dev
```

Frontend default: `http://localhost:5173`

---

## 🔌 API & Socket Events

### REST API
- `POST /api/create-room` → creates and returns a room ID

### Socket Events
- `join-room` → join a room with `roomId` + `username`
- `send-message` → send message payload to room peers
- `receive-message` → incoming message event
- `destroy-room` → broadcasts room teardown
- `room-destroyed` → client redirect trigger
- `user-joined` / `user-left` → room activity notifications

---

## 🛡️ Environment & CORS Notes

The backend currently allows:
- `http://localhost:5173`
- `https://ghostedchat.vercel.app`

Update allowed origins in `server/server.js` when adding environments.

---

## 📜 Scripts

### Client
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview built app
- `npm run lint` — run ESLint

### Server
- `npm run dev` — start server with nodemon
- `npm start` — start server with Node

---

## 🤝 Contributing

Contributions, issues, and feature ideas are welcome.

1. Fork the repo
2. Create your branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a pull request

---

## 📄 License

This project is currently marked as **ISC** in the backend package configuration.

---

## 🙌 Acknowledgements

Built with love using React, Socket.IO, Express, and MongoDB.
