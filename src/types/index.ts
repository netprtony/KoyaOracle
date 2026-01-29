// ============================================
// GAME MODES
// ============================================

export enum GameMode {
    PHYSICAL_CARD = 'PHYSICAL_CARD',
    RANDOM_ROLE = 'RANDOM_ROLE',
}

// ============================================
// NIGHT ACTION TYPES
// ============================================

export type NightActionType = 'selectTarget' | 'none';

// ============================================
// ROLE DEFINITION
// ============================================

export interface Role {
    id: string;
    name: string;
    icon: string; // emoji or asset path
    description: string;
    nightActionType: NightActionType;
    // order removed as it is scenario dependent
}

// ============================================
// SCENARIO DEFINITION
// ============================================

export interface ScenarioRole {
    roleId: string;
    quantity: number;
}

export interface Scenario {
    id: string;
    name: string;
    playerCount: number;
    roles: ScenarioRole[];
    nightOrder: NightOrderDefinition; // Changed from string[]
}

export interface NightOrderDefinition {
    firstNight: string[];
    otherNights: string[];
}

// ============================================
// PLAYER
// ============================================

export interface Player {
    id: string;
    name: string;
    color: string; // player color indicator
    roleId: string | null; // null if role not yet assigned
    isAlive: boolean;
    position: number; // seating order
}

// ============================================
// PHASE TRACKING
// ============================================

export type PhaseType = 'NIGHT' | 'DAY';

export type DaySubPhase = 'SUNRISE' | 'DISCUSSION' | 'VOTING' | 'ANNOUNCEMENT' | 'SLEEP_TRANSITION';

export interface Phase {
    type: PhaseType;
    number: number; // Night 1, Day 1, Night 2, etc.
    daySubPhase?: DaySubPhase; // Sub-phase for day
}

// ============================================
// NIGHT ACTION
// ============================================

export interface NightAction {
    roleId: string;
    targetPlayerId: string | null; // null if no target selected or action skipped
    timestamp: number;
}

// ============================================
// MATCH LOG ENTRY
// ============================================

export type LogEntryType =
    | 'PHASE_START'
    | 'ROLE_ACTION'
    | 'DEATH'
    | 'LYNCH'
    | 'GAME_START';

export interface MatchLogEntry {
    id: string;
    type: LogEntryType;
    timestamp: number;
    phase: Phase;
    message: string;
    metadata?: Record<string, any>;
}

// ============================================
// GAME SESSION
// ============================================

export interface GameSession {
    id: string;
    mode: GameMode;
    scenarioId: string;
    players: Player[];
    currentPhase: Phase;
    matchLog: MatchLogEntry[];
    nightOrder?: NightOrderDefinition; // Optional override for this session
    nightActions: NightAction[]; // actions for current night
    createdAt: number;
    updatedAt: number;
}

// ============================================
// GAME STATE (Zustand Store)
// ============================================

export interface GameState {
    // Session data
    session: GameSession | null;

    // Available roles and scenarios (loaded from JSON)
    availableRoles: Role[];
    availableScenarios: Scenario[];

    // Actions
    initializeGame: (mode: GameMode, scenarioId: string, playerData: Array<{ name: string; color: string }>) => void;
    assignRole: (playerId: string, roleId: string) => void;
    recordNightAction: (roleId: string, targetPlayerId: string | null) => void;
    advanceToDay: () => void;
    lynchPlayer: (playerId: string) => void;
    advanceToNight: () => void;
    addLogEntry: (entry: Omit<MatchLogEntry, 'id' | 'timestamp' | 'phase'>) => void;

    // Persistence
    saveGame: () => Promise<void>;
    loadGame: () => Promise<void>;
    clearGame: () => void;

    // Asset loading
    loadAssets: () => Promise<void>;

    // Custom Scenarios
    addCustomScenario: (name: string, roles: ScenarioRole[]) => Promise<void>;
    deleteCustomScenario: (id: string) => Promise<void>;
    updateNightOrder: (order: NightOrderDefinition) => void;
}
