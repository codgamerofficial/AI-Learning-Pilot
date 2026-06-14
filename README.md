<div align="center">
  <img src="https://img.shields.io/badge/EXPO-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
</div>

<br />

<div align="center">
  <h1 align="center">🎵 NeoTunes</h1>
  <p align="center">
    <strong>A high-performance, royalty-free music streaming app with a Brutalist aesthetic.</strong>
  </p>
</div>

## ✨ Features

- **Multi-Source Streaming Engine:** Effortlessly pull tracks from massive platforms like **YouTube** or discover legal, royalty-free MP3s via the **Jamendo API**.
- **Global Audio Engine:** Audio lives completely outside of the screen hierarchy. You can navigate the entire app seamlessly without music dropping, skipping, or reloading.
- **Premium UI & Animations:** Built with `react-native-reanimated`. Includes silky-smooth glassmorphism interfaces, animated Equalizer bars responding instantly to play states, a rotating vinyl disc player, and a buttery timeline progress slider.
- **Node.js Express Backend (`/neotunes-api`):** Offloads heavy processing from the frontend. Automatically blends search results from multiple disparate platforms into one clean stream of `Track` models.
- **Dual Trending Feeds:** Toggle dynamically between "Global Hits" and "India Bollywood" directly on the Home Screen. Blazingly fast due to in-memory caching.
- **Supabase Cloud State:** Global user states, Authentication, and "Saved Tracks" dynamically backed up and synced via PostgreSQL on Supabase.
- **Cross-Platform:** Writes once, runs seamlessly with Native performance on iOS/Android, and works interactively on React Native Web environments.

## 🏗 Architecture

```text
React Native (Expo + NativeWind)      
       ↓                          
─────────────────────────────────────────
       NeoTunes Backend API (Express.js)
─────────────────────────────────────────
      YouTube API │ Jamendo API        
─────────────────────────────────────────
      Supabase (Auth + PostgreSQL)     
```

## 🚀 Quick Setup

### 1. Initialize the Backend
```bash
cd neotunes-api
npm install
# Add your YOUTUBE_API_KEY and JAMENDO_CLIENT_ID to .env
node index.js
```

### 2. Initialize the App
```bash
cd neotunes
npm install
npx expo start
```

## 🎨 Design Philosophy
NeoTunes completely avoids generic Material or flat designs. It relies heavily on **Brutalist / Blocky** UI principles:
- Absolute, pure dark backgrounds (`#0A0A0A`).
- Aggressive solid borders with unapologetically sharp, bold shadows (`4px 4px 0px rgba(x,x,x,1)`).
- Kinetic neon accents complementing the artwork's dominant palette (`#7B61FF`, `#00FF85`, `#00D4FF`).

---
*Developed by codgamerofficial*