import { Role, NightAction as RoleNightAction, SkillType } from '../../assets/role-types';

export * from '../../assets/role-types';

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

// ============================================
// ROLE DEFINITION
// ============================================

// Using Role from assets/role-types
// If we need to extend it for runtime-specific UI props, we can do it here, but generally we should use the one source.
// NOTE: role-types Role uses 'iconEmoji', while recent code might have used 'icon'. 
// We will stick to 'role-types' definition. Consumers should use `iconEmoji`. 
// If specific UI needs 'icon' (e.g. for asset path), we might need to add it to role-types or alias it.
// For now, removing local Role definition.

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

// ============================================
// NIGHT ACTION
// ============================================

// Extending or using NightAction from role-types.
// The runtime NightAction record might need 'timestamp' which the static definition doesn't have.
// Static NightAction in role-types is "Definition of what a role CAN do".
// Runtime NightAction is "What a role DID".
// Let's rename the runtime one to avoid confusion or keep it but clarify.

export interface NightActionRecord {
    roleId: string;
    targetPlayerId: string | null; // null if no target selected or action skipped
    timestamp: number;
    actionType?: string; // e.g. 'heal', 'kill' for roles with multiple options
}

// Retaining NightAction as alias for legacy support if needed, but preferably swtich to NightActionRecord for logs
// Actually, let's keep the name `NightAction` unique to the static definition if possible, 
// OR just override it if the code uses it for records heavily.
// Code uses `NightAction` heavily for RECORDS (e.g. `recordNightAction`, `session.nightActions`).
// `role-types.ts` uses `NightAction` for DEFINITION. This IS a conflict.
// I will rename the local one to `NightActionRecord` but I need to update all usages.
// OR I alias the import from role-types to `NightActionDefinition`.

// Let's alias the IMPORT. See top of file.
// `import { NightAction as NightActionDefinition } ...`
// So `NightAction` here refers to the Record.

export interface NightAction {
    roleId: string;
    targetPlayerId: string | null; // null if no target selected or action skipped
    timestamp: number;
    actionType?: string; // e.g. 'heal', 'kill' for roles with multiple options
}

// ============================================
// MATCH LOG ENTRY
// ============================================

export type LogEntryType =
    | 'PHASE_START'
    | 'ROLE_ACTION'
    | 'DEATH'
    | 'LYNCH'
    | 'GAME_START'
    | 'GAME_EVENT';

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
    commandInvoker?: any; // Domain layer CommandInvoker

    // Actions
    loadAssets: () => Promise<void>;
    initializeGame: (mode: GameMode, scenarioId: string, playerData: Array<{ name: string; color: string }>) => void;
    assignRole: (playerId: string, roleId: string | null) => void;
    recordNightAction: (roleId: string, targetPlayerId: string | null, actionType?: string) => void;
    advanceToDay: () => void;
    lynchPlayer: (playerId: string) => void;
    advanceToNight: () => void;
    addLogEntry: (entry: Omit<MatchLogEntry, 'id' | 'timestamp' | 'phase'>) => void;

    // Persistence
    saveGame: () => Promise<void>;
    loadGame: () => Promise<void>;
    clearGame: () => void;
    undo?: () => void;
    redo?: () => void;

    // Custom Scenarios
    addCustomScenario: (name: string, roles: ScenarioRole[]) => Promise<void>;
    deleteCustomScenario: (id: string) => Promise<void>;
    updateNightOrder: (order: NightOrderDefinition) => void;
    processNightDeaths: (playerIds: string[]) => void;
}
