# AI Interview Coach App

This is a React Native + Expo based AI Interview Coach application.

Tech Stack:
- React Native
- Expo
- React Navigation
- expo-speech (AI voice)
- Custom realtime waveform
- Backend interview APIs

Current Screens:
- HomeScreen
- MockInterviewScreen
- SessionPickerScreen
- InterviewScreen

Flow:
Home → Interview Coach → Session Picker → Interview Screen

AI asks question → user answers using mic → audio sent to backend → backend returns feedback + next question.

Important:
Please avoid modifying these core files:
- MockInterviewScreen
- InterviewScreen
- useRealtimeWaveform
- Waveform component
- interviewApi.js

You can build new screens like:
- Profile Screen
- Resume Upload Screen
- Interview History
- Session Result Screen

Run the project:

npm install
npx expo start