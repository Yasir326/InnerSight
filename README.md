# InnerSight

<div align="center">
  <img src="src/assets/png/logo-color-brain.png" alt="InnerSight Logo" width="200" height="200">
  
  **YOUR THOUGHTS. YOUR SPACE. NO ONE ELSE.**
  
  *An AI-powered journaling companion for personal growth and self-reflection*
</div>

## About InnerSight

InnerSight is a React Native mobile application that transforms the traditional journaling experience with the power of artificial intelligence. More than just a digital diary, InnerSight serves as your personal companion for self-discovery, emotional awareness, and mental wellness.

### What Makes InnerSight Special

- **🤖 AI-Powered Insights**: Get thoughtful analysis of your journal entries with personalized themes, emotions, and alternative perspectives
- **🎯 Personalized Experience**: Tailored onboarding process that adapts AI responses to your unique goals and challenges  
- **📊 Visual Analytics**: Beautiful charts and visualizations that help you understand your emotional patterns over time
- **🔒 Complete Privacy**: Your thoughts stay yours - all data is stored locally on your device
- **💡 Alternative Perspectives**: AI-generated compassionate reframing to help you see situations in new, more positive ways
- **🏷️ Smart Titles**: Automatically generated meaningful titles for your entries using AI
- **👋 Personal Touch**: Personalized greetings and interactions based on your onboarding preferences

### Key Features

#### Intelligent Journaling
- Write freely in a distraction-free environment
- AI generates insightful titles that capture the essence of your entries
- Get thoughtful, psychiatrist-like responses that encourage deeper reflection

#### Personal Growth Analytics  
- Discover recurring themes in your thoughts and experiences
- Track emotional patterns with detailed breakdowns
- Visualize your journey with interactive charts and graphs

#### Compassionate AI Companion
- Receive alternative perspectives that promote self-compassion
- Get personalized insights based on your stated goals and challenges
- Experience therapeutic-quality responses designed to support mental wellness

#### Seamless Experience
- Beautiful, intuitive interface designed for daily use
- Smooth onboarding that learns about your journaling goals
- Fast, responsive performance with offline-first design

## Getting Started

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) before proceeding.

### Prerequisites

- Node.js (v16 or higher)
- React Native CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Yasir326/InnerSight.git
   cd InnerSight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=${your_openai_api_key_here}
     ```

4. **Install iOS dependencies** (iOS only)
   ```bash
   bundle install
   bundle exec pod install
   ```

### Running the App

1. **Start Metro bundler**
   ```bash
   npm start
   ```

2. **Run on your preferred platform**
   
   **For iOS:**
   ```bash
   npm run ios
   ```
   
   **For Android:**
   ```bash
   npm run android
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # App screens and navigation
├── services/           # API services and utilities
│   ├── ai.ts          # OpenAI integration for insights
│   ├── journalEntries.ts  # Local storage management
│   └── onboarding.ts  # User preferences and setup
├── types/             # TypeScript type definitions
└── assets/            # Images, icons, and static files
```

## Core Technologies

- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript development  
- **OpenAI GPT-4** - AI-powered insights and analysis
- **AsyncStorage** - Local data persistence
- **React Navigation** - Screen navigation and routing
- **Victory Charts** - Data visualization and analytics

## Privacy & Security

InnerSight is built with privacy as a core principle:

- **Local Storage**: All journal entries are stored locally on your device
- **No Data Collection**: We don't collect, store, or share your personal journal content
- **Secure API**: AI analysis is processed securely through encrypted connections
- **Your Data, Your Control**: You can export or delete your data at any time

## Contributing

We welcome contributions to make InnerSight even better! Please feel free to:

- Report bugs or suggest features through issues
- Submit pull requests for improvements
- Share feedback on the user experience

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the [React Native Troubleshooting Guide](https://reactnative.dev/docs/troubleshooting)
2. Review the project issues on GitHub
3. Reach out to the development team

---

<div align="center">
  <strong>Start your journey of self-discovery with InnerSight today.</strong>
  
  *Because understanding yourself is the first step to growth.*
</div>
