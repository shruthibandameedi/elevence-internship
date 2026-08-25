# YouTube 2.0 - Full-Stack Video Platform

A feature-packed YouTube clone built with Next.js, Node.js/Express, MongoDB, Socket.io, and WebRTC.

## 🚀 Features

- **Frontend (`yourtube`)**: Next.js app with TailwindCSS, Lucide icons, dynamic themes, video playback, watch party (WebRTC), comments, likes, subscriptions, and download tracking.
- **Backend (`server`)**: Node.js & Express API with MongoDB, JWT authentication, video streaming/upload handlers, Razorpay integration, email notification services, and Socket.io for real-time watch parties.

## 📁 Repository Structure

```
.
├── server/            # Express backend API & Socket.io server
├── yourtube/          # Next.js frontend application
├── package.json       # Root scripts (runs both client & server)
└── start.bat          # Quick-start batch file for Windows
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas connection string

### Setup Environment Variables
Copy `server/.env.example` to `server/.env` and update the required keys:
```bash
cp server/.env.example server/.env
```

### Installation & Running Locally

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Install dependencies for both server and client:
   ```bash
   cd server && npm install
   cd ../yourtube && npm install
   cd ..
   ```

3. Run both client and server concurrently:
   ```bash
   npm run dev
   ```

- Frontend: `http://localhost:3000`
- Backend Server: `http://localhost:5000`