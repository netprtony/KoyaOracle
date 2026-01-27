# KoyaOracle - Werewolf Game Master App

Welcome to **KoyaOracle**, the ultimate Game Master companion for the popular card game **Werewolf (Ma Sói)**. This mobile application is designed to streamline the role of the Game Master, allowing for customized scenarios, automated phase management, and tracking of game history.

## 🌟 Features

-   **Game Management**:
    -   Support for both **Physical Card Mode** (players have physical cards) and **Random Role Mode** (app assigns roles).
    -   Customizable scenarios with varying player counts and role distributions.
    -   Automated day/night phase transitions and timer management.
    -   Role-specific logic and interaction handling.

-   **Player Management**:
    -   Maintain a permanent database of players.
    -   Track individual statistics (games played, win rates).
    -   Quickly select players for new games from your saved list.
    -   Batch add players for quick setup.

-   **Match History**:
    -   Detailed logs of every match played.
    -   Review past game events, winners, and role assignments.

-   **Settings**:
    -   Configurable discussion timers.
    -   Database management (clear data, export/import).

-   **Modern UI/UX**:
    -   Dark-themed, immersive interface suitable for game nights.
    -   Smooth animations and intuitive navigation.

## 🛠 Tech Stack

-   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/).
-   **Language**: [TypeScript](https://www.typescriptlang.org/).
-   **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/).
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand).
-   **Database**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
-   **Styling**: React Native StyleSheet with custom theming.
-   **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/).

## 📱 Installation & Running

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

1.  **Clone the repository**:
    ```bash
    git clone git@github.com:netprtony/KoyaOracle.git
    cd KoyaOracle
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npx expo start
    ```

4.  **Run on a device/emulator**:
    -   Download the **Expo Go** app on iOS or Android.
    -   Scan the QR code shown in the terminal.
    -   Or press `a` for Android Emulator / `i` for iOS Simulator.

## 📂 Project Structure

```
KoyaOracle/
├── app/                 # Expo Router screens and layout
│   ├── (tabs)/          # Main tab navigation screens
│   └── ...              # Other modal/stack screens
├── assets/              # Images, fonts, and configuration files
├── src/
│   ├── components/      # Reusable UI components
│   ├── engine/          # Core game logic
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand state management
│   ├── styles/          # Theme and global styles
│   ├── types/           # TypeScript interface definitions
│   └── utils/           # Helper functions and database service
└── README.md            # Project documentation
```

## 🤝 Contributing

Contributions are welcome! If you have suggestions for new roles, features, or bug fixes, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.
