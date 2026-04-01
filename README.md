# 🎙️ Mock Interview Engine

## 🚀 Project Overview
A production-ready React Native mobile application integrating an interactive AI Mock Interview system. Built with modern, scalable tools, this application allows users to experience real-time audio assessments and receive deep gap-analysis feedback, powered identically by a dynamic FastAPI backend system.

## 🧱 Tech Stack
* **Frontend:** React Native (Expo) & Expo Router
* **Language:** TypeScript
* **State Management:** Redux Toolkit / RTK Query
* **Styling:** NativeWind (Tailwind CSS)
* **Backend Integration:** FastAPI (Streaming Audio & Result Pipelines)

## 📂 Folder Structure
The codebase strictly relies on a flattened, separation-of-concerns architecture:
```text
src/
 ├── screens/     # Full-page UI views & navigation entries
 ├── components/  # Reusable UI elements (Waveforms, Cards)
 ├── hooks/       # Custom React logic (Audio Lifecycle, Data Fetching)
 ├── services/    # API endpoints & RTK Query slices
 ├── store/       # Global Redux state slices & root store
 ├── utils/       # Utility functions & navigation bridges
 └── constants/   # Hardcoded constants & API configurations
```

## ⚙️ Setup Instructions

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd Interview_App
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up Environment Variables**
A `.env.example` file is provided for you natively.
```bash
cp .env.example .env
```
Ensure you explicitly map the `EXPO_PUBLIC_API_URL` to your active backend's physical IP address (avoid `localhost` if deploying to physical Android devices).

**4. Start the Application**
```bash
npx expo start --dev-client -c
```

## 🔌 Environment Variables
* `EXPO_PUBLIC_API_URL` → Points to your active FastAPI backend's base URL (e.g., `http://192.168.1.7:8000`).

## 🧪 Scripts
* `npm run start` - Boots the Expo Metro bundler.
* `npm run android` - Compiles and installs the Android development client.
* `npm run ios` - Compiles the iOS development client natively.

## ⚠️ Notes
* **Network:** Mobile devices MUST literally be connected on the exact same Wi-Fi/LAN network as your active local FastAPI Backend, resolving an explicit local IP address.
* **Fallback Warning:** If the `.env` fails to mount `EXPO_PUBLIC_API_URL`, the app safely defaults to `http://127.0.0.1:8000` to prevent runtime crashes during debugging but will spawn a native YellowBox Warning terminal alert.