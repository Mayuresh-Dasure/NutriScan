# 🥗 NutriScan
> **Know What You Eat, Instantly.**

[![Download APK](https://img.shields.io/badge/Download-APK-00C853?style=for-the-badge&logo=android&logoColor=white)](https://expo.dev/accounts/satyammah/projects/nutriscanner/builds/f6b088c8-9fe1-4b41-b296-33108b7b01a0)

[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000.svg?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini%203.0-8E75B2.svg?style=flat&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28.svg?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)

---

## 🚀 Overview
**NutriScan** is an AI-powered mobile assistant that helps you decode complex food labels in seconds. By simply snapping a photo, our app uses **Google's Gemini 3.0 Flash** model to analyze ingredients, identify hidden sugars or allergens, and provide a personalized **Health Score**.

Built for **GDG TechSprint**, this project bridges the gap between complex nutritional data and everyday consumer choices.

## 🧐 The Problem
*   **Confusing Labels:** Nutrition tables and ingredient lists are often hard to read and deceptive.
*   **Hidden Ingredients:** Names like "E102" or "High Fructose Corn Syrup" don't clearly say "Unhealthy" or "Non-Veg".
*   **Dietary Anxiety:** Vegetarians and Vegans struggle to trust products with vague labeling.

## 💡 The Solution
NutriScan acts as your personal nutritionist.
1.  **Scan:** Point your camera at any food packet.
2.  **Process:** The app sends the image to **Gemini AI**, which "reads" the text using advanced OCR and understands context.
3.  **Result:** You get a simple **Health Score (0-100)**, a clear **Veg/Non-Veg verdict**, and a breakdown of **Additives & Allergens**.

---

## ✨ Key Features
*   📸 **AI Label Scanning**: No manual entry. Just point and shoot.
*   🥦 **Smart Classification**: Instantly knows if it's Veg, Non-Veg, or Vegan.
*   ❤️ **Health Score**: A 0-100 rating based on *your* profile (General Health, Muscle Gain, etc.).
*   ⚠️ **Smart Warnings**: Alerts for hidden sugars, preservatives, and allergens.
*   📜 **Scan History**: Keep a diary of everything you've scanned (Delete with a swipe!).

---

## 🛠️ Tech Stack
This project leverages a modern, serverless architecture:

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **React Native (Expo)** | Cross-platform mobile UI |
| **AI Brain** | **Google Gemini 3.0 Flash** | OCR, analysis, and scoring logic |
| **Backend** | **Firebase** | Authentication & Realtime Database |
| **Networking** | **Axios** | API communication |

---

## 🔄 Project Workflow
1.  **User logs in** and sets a profile (e.g., "Vegetarian").
2.  User taps **"Scan"** and captures a product image.
3.  App converts image to Base64 and sends it to **Gemini API**.
4.  **Gemini** analyzes ingredients vs. User Profile.
5.  App displays **Result Card**: "Health Score: 85 - Good Choice!".

---

## 🏃‍♂️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Mayuresh-Dasure/LabelScanner.git
    cd LabelScanner
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `.env` file and add your Google Gemini API Key:
    ```env
    EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the App**
    ```bash
    npx expo start
    ```

---

## 🔮 Future Enhancements
*   📊 **Barcode Scanning Integration** for faster lookup.
*   🗣️ **Multi-language Support** for regional users.
*   🩺 **Doctor Integration** to share scans with nutritionists.

---

## 🤝 Contribution
Got ideas? We'd love to hear them!
1.  Fork the repo.
2.  Create a feature branch.
3.  Submit a Pull Request.

---

> **Note for Judges:** This app was built to demonstrate the power of **multimodal AI (Gemini 3.0)** in solving real-world consumer problems.
