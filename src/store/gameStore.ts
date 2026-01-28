import { create } from 'zustand';
import { GameState, GameSession, GameMode, Player, MatchLogEntry, Role, Scenario } from '../types';
import { loadRoles, loadScenarios, getScenarioById } from '../utils/assetLoader';
import { storage } from '../utils/storage';
import { database } from '../utils/database';
import { assignRandomRoles } from '../engine/roleAssignment';
import { createInitialPhase, advanceToDay as advanceToDayPhase, advanceToNight as advanceToNightPhase } from '../engine/phaseController';

/**
 * Zustand store for game state management
 */
export const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    session: null,
    availableRoles: [],
    availableScenarios: [],

    // Load assets from JSON files and Database
    loadAssets: async () => {
        try {
            const roles = loadRoles();
            const defaultScenarios = loadScenarios();

            // Load custom scenarios from database
            let customScenarios: Scenario[] = [];
            try {
                if (database.isAvailable()) {
                    const dbScenarios = await database.getCustomScenarios();
                    customScenarios = dbScenarios as Scenario[];
                }
            } catch (err) {
                console.warn('Failed to load custom scenarios:', err);
            }

            set({ availableRoles: roles, availableScenarios: [...defaultScenarios, ...customScenarios] });
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    },

    // Initialize a new game
    initializeGame: (mode: GameMode, scenarioId: string, playerData: Array<{ name: string; color: string }>) => {
        const { availableRoles, availableScenarios } = get();
        const scenario = getScenarioById(scenarioId, availableScenarios);

        if (!scenario) {
            console.error('Scenario not found');
            return;
        }

        // Create players with colors
        let players: Player[] = playerData.map((data, index) => ({
            id: `player_${index}_${Date.now()}`,
            name: data.name,
            color: data.color,
            roleId: null,
            isAlive: true,
            position: index,
        }));

        // Assign roles if Random Role mode
        if (mode === GameMode.RANDOM_ROLE) {
            players = assignRandomRoles(players, scenario, availableRoles);
        }

        const now = Date.now();
        const session: GameSession = {
            id: `session_${now}`,
            mode,
            scenarioId,
            players,
            currentPhase: createInitialPhase(),
            matchLog: [],
            nightActions: [],
            createdAt: now,
            updatedAt: now,
        };

        // Add game start log
        const startLog: MatchLogEntry = {
            id: `log_${Date.now()}`,
            type: 'GAME_START',
            timestamp: now,
            phase: session.currentPhase,
            message: `Trò chơi bắt đầu với ${playerData.length} người chơi`,
        };

        session.matchLog.push(startLog);

        set({ session });
        get().saveGame();
    },

    // Assign role to player (Physical Card mode)
    // roleId can be null to unassign a role
    assignRole: (playerId: string, roleId: string | null) => {
        const { session } = get();
        if (!session) return;

        const updatedPlayers = session.players.map((player) =>
            player.id === playerId ? { ...player, roleId } : player
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                updatedAt: Date.now(),
            },
        });

        get().saveGame();
    },

    // Record night action
    recordNightAction: (roleId: string, targetPlayerId: string | null) => {
        const { session } = get();
        if (!session) return;

        const action = {
            roleId,
            targetPlayerId,
            timestamp: Date.now(),
        };

        const updatedActions = [...session.nightActions, action];

        set({
            session: {
                ...session,
                nightActions: updatedActions,
                updatedAt: Date.now(),
            },
        });

        // Add log entry
        const role = get().availableRoles.find((r) => r.id === roleId);
        const target = targetPlayerId
            ? session.players.find((p) => p.id === targetPlayerId)
            : null;

        const message = target
            ? `${role?.name} đã chọn ${target.name}`
            : `${role?.name} đã bỏ qua`;

        get().addLogEntry({
            type: 'ROLE_ACTION',
            message,
            metadata: { roleId, targetPlayerId },
        });

        get().saveGame();
    },

    // Advance to day phase
    advanceToDay: () => {
        const { session } = get();
        if (!session) return;

        const newPhase = advanceToDayPhase(session.currentPhase);

        set({
            session: {
                ...session,
                currentPhase: newPhase,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'PHASE_START',
            message: `Bắt đầu Ngày ${newPhase.number}`,
        });

        get().saveGame();
    },

    // Lynch player
    lynchPlayer: (playerId: string) => {
        const { session } = get();
        if (!session) return;

        const player = session.players.find((p) => p.id === playerId);
        if (!player) return;

        const updatedPlayers = session.players.map((p) =>
            p.id === playerId ? { ...p, isAlive: false } : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'LYNCH',
            message: `${player.name} đã bị treo cổ`,
            metadata: { playerId },
        });

        get().saveGame();
    },

    // Advance to night phase
    advanceToNight: () => {
        const { session } = get();
        if (!session) return;

        const newPhase = advanceToNightPhase(session.currentPhase);

        set({
            session: {
                ...session,
                currentPhase: newPhase,
                nightActions: [], // Clear night actions for new night
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'PHASE_START',
            message: `Bắt đầu Đêm ${newPhase.number}`,
        });

        get().saveGame();
    },

    // Add log entry
    addLogEntry: (entry: Omit<MatchLogEntry, 'id' | 'timestamp' | 'phase'>) => {
        const { session } = get();
        if (!session) return;

        const logEntry: MatchLogEntry = {
            ...entry,
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
            phase: session.currentPhase,
        };

        set({
            session: {
                ...session,
                matchLog: [...session.matchLog, logEntry],
                updatedAt: Date.now(),
            },
        });
    },

    // Save game to storage
    saveGame: async () => {
        const { session } = get();
        if (session) {
            await storage.saveGame(session);
        }
    },

    // Load game from storage
    loadGame: async () => {
        const session = await storage.loadGame();
        if (session) {
            set({ session });
        }
    },

    // Clean up game state
    clearGame: () => {
        set({ session: null });
        storage.clearGame();
    },

    // Add a custom scenario
    addCustomScenario: async (name: string, roles: { roleId: string; quantity: number }[]) => {
        const id = `custom_${Date.now()}`;
        const playerCount = roles.reduce((sum, role) => sum + role.quantity, 0);

        // Simple night order: just list all role IDs. 
        // The engine RoleManager handles the actual priority execution order.
        const nightOrder = roles.map(r => r.roleId);

        const newScenario: Scenario = {
            id,
            name,
            playerCount,
            roles,
            nightOrder
        };

        try {
            if (database.isAvailable()) {
                await database.saveScenario(id, name, playerCount, roles, nightOrder);
            }

            // Update state
            const { availableScenarios } = get();
            set({ availableScenarios: [newScenario, ...availableScenarios] });
        } catch (error) {
            console.error('Failed to save custom scenario:', error);
        }
    },

    // Delete a custom scenario
    deleteCustomScenario: async (id: string) => {
        try {
            if (database.isAvailable()) {
                await database.deleteScenario(id);
            }

            // Update state
            const { availableScenarios } = get();
            set({ availableScenarios: availableScenarios.filter(s => s.id !== id) });
        } catch (error) {
            console.error('Failed to delete custom scenario:', error);
        }
    },
}));
