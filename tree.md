KoyaOracle
├── app
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── game.tsx
│   │   ├── history.tsx
│   │   ├── players.tsx
│   │   └── settings.tsx
│   ├── components
│   ├── _layout.tsx
│   ├── game-master-board.tsx
│   ├── index.tsx
│   ├── manual-role-note.tsx
│   ├── order-setup.tsx
│   ├── player-setup.tsx
│   └── scenario-select.tsx
├── assets
│   ├── fonts
│   │   └── TNH-Xuong.otf
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   ├── KichBan.json
│   ├── README.md
│   ├── role-types.ts
│   ├── roles.json
│   └── splash.png
├── src
│   ├── components
│   │   ├── MorningReportModal.tsx
│   │   ├── NightOrderEditor.tsx
│   │   └── SwipeableCardStack.tsx
│   ├── engine
│   │   ├── __tests__
│   │   │   ├── GameEngine.test.ts
│   │   │   ├── PlayerStateManager.test.ts
│   │   │   ├── RoleManager.test.ts
│   │   │   ├── verify_night.ts
│   │   │   └── WinConditionChecker.test.ts
│   │   ├── logic
│   │   │   └── WitchLogic.ts
│   │   ├── ActionResolver.ts
│   │   ├── GameEngine.ts
│   │   ├── index.ts
│   │   ├── NightResolution.ts
│   │   ├── nightSequence.ts
│   │   ├── PassiveSkillHandler.ts
│   │   ├── phaseController.ts
│   │   ├── PlayerStateManager.ts
│   │   ├── roleAssignment.ts
│   │   ├── RoleManager.ts
│   │   └── WinConditionChecker.ts
│   ├── store
│   │   └── gameStore.ts
│   ├── styles
│   │   └── theme.ts
│   ├── types
│   │   └── index.ts
│   └── utils
│       ├── assetLoader.ts
│       ├── database.ts
│       └── storage.ts
├── .gitignore
├── app.json
├── babel.config.js
├── generate_tree.js
├── jest.config.js
├── package-lock.json
├── package.json
├── README.md
├── tree.md
└── tsconfig.json
