# KSubZone - KDrama Streaming & Review Platform

මෙය KDrama Streaming සහ Review Platform එකක ව්‍යාපෘතියයි. මෙහි Frontend (React + Vite) සහ Backend (Node.js + Express) යන කොටස් දෙකම වෙන වෙනම පැහැදිලි ව්‍යුහයකට (structure) සකස් කර ඇත.

This is a premium KDrama Streaming and Review Platform. Both Frontend (React + Vite) and Backend (Node.js + Express) are organized in a clean and modular structure.

---

## 📂 File & Directory Structure (ෆයිල් ව්‍යුහය)

```text
kdrama/
├── client/                 # Frontend App (React + Vite)
│   ├── src/
│   │   ├── components/     # UI Components (Navbar, Footer, HeroSlider, etc.)
│   │   ├── context/        # React Context states (AuthContext, etc.)
│   │   ├── pages/          # View Pages (Home, Detail, Watch, Profile, Search, Auth)
│   │   │   └── management/ # Admin Management Pages (Drama/Movie/Subtitle managers, etc.)
│   │   ├── App.jsx         # Main App router and layout definitions
│   │   ├── index.css       # Tailwind/Vanilla CSS configurations
│   │   └── main.jsx        # App entry point
│   ├── package.json        # Frontend dependencies & configurations
│   └── vite.config.js      # Vite dev settings
│
├── server/                 # Backend API (Node.js + Express)
│   ├── config/             # DB & third-party configs (MongoDB connection, Cloudinary)
│   ├── controllers/        # API Controller logics (Auth, SEO, Subtitle, TMDB, Drama, etc.)
│   ├── middleware/         # Security, Auth Guard, and Error Handling middlewares
│   ├── models/             # Mongoose Database schemas (User, Drama, Movie, Subtitle, etc.)
│   ├── public/             # Static public assets (e.g. Uploaded subtitles, temp files)
│   ├── routes/             # Express routes mapped to controllers
│   ├── server.js           # Server entrance point and configuration
│   └── package.json        # Backend dependencies & configurations
│
├── package.json            # Root configuration for monorepo development
└── .gitignore              # Files to exclude from Git tracking
```

---

## 🚀 Setup & Execution Guide (ආරම්භ කරන්නේ කෙසේද?)

### 1. Requirements (අවශ්‍යතා)
- **Node.js** (v16 හෝ ඊට ඉහළ) installed.
- **MongoDB Database** (දේශීයව හෝ MongoDB Atlas cloud හරහා).

### 2. Environment Variables Configuration (පරිසර විචල්‍යයන් සැකසීම)
`server` ෆෝල්ඩරය තුළ `.env` ෆයිල් එකක් සාදා එහි පහත ආකාරයට අවශ්‍ය විචල්‍යයන් එකතු කරන්න:
Create a `.env` file inside the `server` directory and add your configurations:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
TMDB_READ_ACCESS_TOKEN=your_tmdb_bearer_token
```

### 3. Dependencies Installation (පැකේජ ස්ථාපනය කිරීම)
ප්‍රධාන (root) ඩිරෙක්ටරිය තුළ සිට පහත විධානය (command) ක්‍රියාත්මක කිරීමෙන් frontend සහ backend යන දෙකෙහිම dependencies එකවර ස්ථාපනය කර ගත හැක:
Install dependencies for both client and server at once from the project root:
```bash
npm run install-all
```

### 4. Running the Development Server (ධාවනය කිරීම)
Frontend සහ Backend සේවා දෙකම එකවර dev mode එකෙන් ධාවනය කිරීමට root directory එකෙහි සිට පහත විධානය ක්‍රියාත්මක කරන්න:
Run both frontend and backend concurrently in development mode:
```bash
npm run dev
```

මෙමගින්:
- Client (React) එක `http://localhost:5173` හි ධාවනය වේ.
- Server (Express API) එක `http://localhost:5000` හි ධාවනය වේ.
