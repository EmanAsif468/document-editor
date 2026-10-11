# PaperSpace

PaperSpace is a web-based document editor that allows users to create, edit, format, save, and manage documents.

## Features

- Create, rename, and delete documents
- Edit text using a rich-text editor (TipTap)
- Apply bold, italic, underline, headings, and bullet/numbered lists
- Search documents by title
- Automatically save document changes
- Store documents in MongoDB
- Upload and download TXT files
- Export documents as PDF
- Light and dark mode interface
- Word and character count

## Technologies Used

**Frontend**
- React.js (Vite)
- JavaScript
- CSS
- TipTap Editor
- jsPDF and html2canvas

**Backend**
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose

## Project Structure

```
document-editor/
├── src/          # React frontend
├── public/
├── server/       # Node.js + Express backend
│   ├── models/
│   └── server.js
├── package.json  # Frontend dependencies
└── README.md
```

## Installation and Setup

### 1. Backend

```bash
cd server
npm install
node server.js
```

Create a `server/.env` file:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

The backend runs at http://localhost:5000

### 2. Frontend

Open a new terminal in the project root and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Purpose

PaperSpace provides a simple interface for creating, editing, saving, and exporting digital documents.