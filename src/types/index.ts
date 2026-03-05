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
// BEWITCHED STATE
// ============================================

/** Transformation lifecycle for the Bị Quyến (Bewitched) role. */
export type BewitchedState =
    | 'VILLAGER'           // Starting state
    | 'TRANSFORMING_WOLF'  // Bitten by wolf, transforms next night
    | 'WOLF'               // Fully transformed into wolf
    | 'TRANSFORMING_VAMPIRE' // Bitten by vampire, transforms next night
    | 'VAMPIRE';           // Fully transformed into vampire

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
    killedBy?: 'execution' | 'werewolf' | 'poison' | 'hunter' | 'vampire' | 'other'; // Track death cause for win conditions
    isBlessed?: boolean; // true if blessed by Pastor this night
    // ── Kẻ Phản Bội (Traitor) ─────────────────────────────────────────────
    /** Hidden wolf-team allegiance; never shown to village */
    isTraitor?: boolean;
    /** Internal team override – counts as 'werewolf' for win checks */
    traitorTeam?: 'werewolf' | null;
    // ── Bị Quyến (Bewitched) ──────────────────────────────────────────────
    bewitchedState?: BewitchedState;
    bewitchedBittenBy?: 'werewolf' | 'vampire' | null;
    // ── Lovers (Cặp Đôi) ──────────────────────────────────────────────────
    /** True if this player was chosen by Cupid to be a lover */
    isLover?: boolean;
    /** Partner's playerId (the other lover) */
    loverId?: string | null;
    // ── Cult (Giáo Phái) ────────────────────────────────────────────────────
    /** True once recruited by Cult Leader */
    isCultMember?: boolean;
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
    | 'GAME_EVENT'
    | 'PASTOR_BLESS'
    | 'MEDIUM_SCRY'
    | 'TRAITOR_ASSIGNED'
    | 'BEWITCHED_BITTEN'
    | 'BEWITCHED_TRANSFORMED'
    | 'LOVERS_ASSIGNED'
    | 'LOVER_GRIEF'
    | 'CULT_RECRUIT';

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

export interface MediumScryResult {
    targetId: string;
    isCorrect: boolean;
}

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
    // Pastor state
    pastorHasUsedAbility?: boolean;
    blessedPlayerId?: string | null;
    // Medium state
    mediumLastResult?: MediumScryResult | null;
    // Traitor (Kẻ Phản Bội) state
    traitorPlayerId?: string | null;
    traitorAssigned?: boolean; // becomes true after Night-1 wolf phase
    // Bewitched (Bị Quyến) – players who transformed this night (for GM alert)
    transformedThisNight?: { playerId: string; newTeam: 'werewolf' | 'vampire' }[];
    // Lovers (Cặp Đôi) state
    loversAssigned?: boolean;
    lover1Id?: string | null;
    lover2Id?: string | null;
    cupidPlayerId?: string | null;
    // Cult (Giáo Phái) state
    cultLeaderPlayerId?: string | null;
    cultMemberIds?: string[];
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
    clearNightActionForRole: (roleId: string, actionType?: string) => void;
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
    processDeathWithCause: (playerId: string, cause: 'execution' | 'werewolf' | 'poison' | 'hunter' | 'vampire' | 'other') => void;
    // Pastor
    pastorBless: (targetId: string) => void;
    // Medium
    mediumScry: (targetId: string) => void;
    clearMediumResult: () => void;
    // Traitor (Kẻ Phản Bội)
    assignTraitor: (playerId: string) => void;
    // Bewitched (Bị Quyến)
    markBewitchedBitten: (playerId: string, killedBy: 'werewolf' | 'vampire') => void;
    clearTransformedThisNight: () => void;
    // Lovers (Cặp Đôi)
    assignLovers: (player1Id: string, player2Id: string) => void;
    // Cult (Giáo Phái)
    recruitToCult: (targetId: string) => void;
    // Utility
    resetBlessedPlayers: () => void;
    // History
    saveMatchToHistory: (winner?: string) => Promise<void>;
}
