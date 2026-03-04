import { create } from 'zustand';
import { GameState, GameSession, GameMode, Player, MatchLogEntry, Role, Scenario, NightOrderDefinition, ScenarioRole, NightAction } from '../types';
import { loadRoles, loadScenarios, getScenarioById } from '../utils/assetLoader';
import { storage } from '../utils/storage';
import { database } from '../utils/database';
import { assignRandomRoles } from '../engine/roleAssignment';
import { createInitialPhase, advanceToDay as advanceToDayPhase, advanceToNight as advanceToNightPhase } from '../engine/phaseController';
import { CommandInvoker, getCommandFactory } from '../domain';
import { storePlayersToDomainState, domainStateToStorePlayers } from './storeAdapter';
import { isSeerRole } from '../engine/logic/SeerScanLogic';

/**
 * Zustand store for game state management
 */
export const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    session: null,
    availableRoles: [],
    availableScenarios: [],

    // Domain layer integration
    commandInvoker: new CommandInvoker(),

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

        // Initialize Bewitched state for bi_quyen players
        players = players.map(p =>
            p.roleId === 'bi_quyen'
                ? { ...p, bewitchedState: 'VILLAGER' as const }
                : p
        );

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
            pastorHasUsedAbility: false,
            blessedPlayerId: null,
            mediumLastResult: null,
            traitorPlayerId: null,
            traitorAssigned: false,
            transformedThisNight: [],
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

    // Record night action (with command pattern integration)
    recordNightAction: (roleId: string, targetPlayerId: string | null, actionType?: string) => {
        const { session, commandInvoker } = get();
        if (!session) return;

        // Legacy action recording (for backward compatibility)
        const action: NightAction = {
            roleId,
            targetPlayerId,
            timestamp: Date.now(),
            actionType,
        };

        const updatedActions = [...session.nightActions, action];

        // Create command if actionType and target are provided
        if (actionType && targetPlayerId) {
            try {
                const factory = getCommandFactory();
                const actorPlayer = session.players.find(p => p.roleId === roleId);

                if (actorPlayer) {
                    const command = factory.createCommandFromRole(
                        roleId,
                        actionType,
                        actorPlayer.id,
                        [targetPlayerId]
                    );

                    if (command) {
                        // Convert to domain state
                        const domainState = storePlayersToDomainState(
                            session.players,
                            session.currentPhase.number
                        );

                        // Execute command
                        const result = commandInvoker.execute(command, domainState);

                        if (result.isSuccess) {
                            // Convert back to store players
                            const updatedPlayers = domainStateToStorePlayers(result.newState);

                            set({
                                session: {
                                    ...session,
                                    players: updatedPlayers,
                                    nightActions: updatedActions,
                                    updatedAt: Date.now(),
                                },
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error executing command:', error);
            }
        }

        // Fallback to legacy behavior if command execution failed
        if (!get().session || get().session?.nightActions.length === updatedActions.length - 1) {
            set({
                session: {
                    ...session,
                    nightActions: updatedActions,
                    updatedAt: Date.now(),
                },
            });
        }

        // Add log entry
        const role = get().availableRoles.find((r) => r.id === roleId);
        const target = targetPlayerId
            ? session.players.find((p) => p.id === targetPlayerId)
            : null;

        let actionVerb = 'đã chọn';
        if (actionType === 'kill') actionVerb = 'đã chọn giết';
        else if (actionType === 'heal') actionVerb = 'đã chọn cứu';
        else if (actionType === 'protect') actionVerb = 'đã bảo vệ';

        const message = target
            ? `${role?.name} ${actionVerb} ${target.name}`
            : `${role?.name} đã bỏ qua` + (actionType ? ` (${actionType})` : '');

        get().addLogEntry({
            type: 'ROLE_ACTION',
            message,
            metadata: { roleId, targetPlayerId, actionType },
        });

        get().saveGame();
    },

    // Clear night action for a specific role and action type
    clearNightActionForRole: (roleId: string, actionType?: string) => {
        const { session } = get();
        if (!session) return;

        const updatedActions = session.nightActions.filter(a => {
            if (a.roleId !== roleId) return true;
            if (actionType && a.actionType !== actionType) return true;
            return false;
        });

        set({
            session: {
                ...session,
                nightActions: updatedActions,
                updatedAt: Date.now(),
            },
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
            p.id === playerId ? { ...p, isAlive: false, killedBy: 'execution' as const } : p
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


    // Process night deaths
    processNightDeaths: (playerIds: string[]) => {
        const { session } = get();
        if (!session || playerIds.length === 0) return;

        const updatedPlayers = session.players.map((p) =>
            playerIds.includes(p.id) ? { ...p, isAlive: false, killedBy: 'werewolf' as const } : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                updatedAt: Date.now(),
            },
        });

        // Add log for each death
        playerIds.forEach(id => {
            const player = session.players.find(p => p.id === id);
            if (player) {
                get().addLogEntry({
                    type: 'DEATH',
                    message: `${player.name} đã chết vào ban đêm`,
                    metadata: { playerId: id },
                });
            }
        });

        get().saveGame();
    },

    // Process death with specific cause (for hunter, poison, vampire, etc.)
    processDeathWithCause: (playerId: string, cause: 'execution' | 'werewolf' | 'poison' | 'hunter' | 'vampire' | 'other') => {
        const { session } = get();
        if (!session) return;

        const player = session.players.find(p => p.id === playerId);
        if (!player) return;

        const updatedPlayers = session.players.map((p) =>
            p.id === playerId ? { ...p, isAlive: false, killedBy: cause } : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                updatedAt: Date.now(),
            },
        });

        // Add log entry
        const causeMessages = {
            execution: 'bị treo cổ',
            werewolf: 'bị sói cắn',
            poison: 'bị đầu độc',
            hunter: 'bị thợ săn bắn',
            vampire: 'bị ma cà rồng hút máu',
            other: 'đã chết'
        };

        get().addLogEntry({
            type: 'DEATH',
            message: `${player.name} ${causeMessages[cause]}`,
            metadata: { playerId, cause },
        });

        get().saveGame();
    },

    // Advance to night phase
    advanceToNight: () => {
        const { session } = get();
        if (!session) return;

        const newPhase = advanceToNightPhase(session.currentPhase);

        // Reset blessed status on all players for the new night
        // Finalize any Bewitched (bi_quyen) transformations that were pending
        const transformedThisNight: { playerId: string; newTeam: 'werewolf' | 'vampire' }[] = [];

        const resetPlayers = session.players.map(p => {
            let updated = { ...p, isBlessed: false };
            // Finalize TRANSFORMING_WOLF → WOLF
            if ((p as any).bewitchedState === 'TRANSFORMING_WOLF') {
                updated = { ...updated, bewitchedState: 'WOLF' as any };
                transformedThisNight.push({ playerId: p.id, newTeam: 'werewolf' });
            }
            // Finalize TRANSFORMING_VAMPIRE → VAMPIRE
            if ((p as any).bewitchedState === 'TRANSFORMING_VAMPIRE') {
                updated = { ...updated, bewitchedState: 'VAMPIRE' as any };
                transformedThisNight.push({ playerId: p.id, newTeam: 'vampire' });
            }
            return updated;
        });

        // Log each transformation
        transformedThisNight.forEach(({ playerId, newTeam }) => {
            const player = session.players.find(p => p.id === playerId);
            if (player) {
                const teamLabel = newTeam === 'werewolf' ? 'Sói' : 'Ma Cà Rồng';
                get().addLogEntry({
                    type: 'BEWITCHED_TRANSFORMED',
                    message: `Bị Quyến ${player.name} đã biến đổi thành ${teamLabel}`,
                    metadata: { playerId, newTeam },
                });
            }
        });

        set({
            session: {
                ...session,
                currentPhase: newPhase,
                nightActions: [], // Clear night actions for new night
                players: resetPlayers,
                blessedPlayerId: null,
                mediumLastResult: null,
                transformedThisNight,
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

    // Undo last command
    undo: () => {
        const { session, commandInvoker } = get();
        if (!session || !commandInvoker) return;

        const domainState = storePlayersToDomainState(
            session.players,
            session.currentPhase.number
        );

        const result = commandInvoker.undo(domainState);

        if (result.isSuccess) {
            const updatedPlayers = domainStateToStorePlayers(result.newState);

            set({
                session: {
                    ...session,
                    players: updatedPlayers,
                    updatedAt: Date.now(),
                },
            });

            get().addLogEntry({
                type: 'GAME_EVENT',
                message: 'Đã hoàn tác hành động',
            });

            get().saveGame();
        }
    },

    // Redo last undone command
    redo: () => {
        const { session, commandInvoker } = get();
        if (!session || !commandInvoker) return;

        const domainState = storePlayersToDomainState(
            session.players,
            session.currentPhase.number
        );

        const result = commandInvoker.redo(domainState);

        if (result.isSuccess) {
            const updatedPlayers = domainStateToStorePlayers(result.newState);

            set({
                session: {
                    ...session,
                    players: updatedPlayers,
                    updatedAt: Date.now(),
                },
            });

            get().addLogEntry({
                type: 'GAME_EVENT',
                message: 'Đã làm lại hành động',
            });

            get().saveGame();
        }
    },

    // Add a custom scenario
    addCustomScenario: async (name: string, roles: { roleId: string; quantity: number }[]) => {
        const id = `custom_${Date.now()}`;
        const playerCount = roles.reduce((sum, role) => sum + role.quantity, 0);

        // Simple night order: just list all role IDs. 
        // The engine RoleManager handles the actual priority execution order.
        // Default to same order for both nights for now
        const roleIds = roles.map(r => r.roleId);
        const nightOrder = {
            firstNight: roleIds,
            otherNights: roleIds
        };

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

    // Update night order for current session
    updateNightOrder: (order: NightOrderDefinition) => {
        const { session } = get();
        if (!session) return;

        set({
            session: {
                ...session,
                nightOrder: order,
                updatedAt: Date.now(),
            }
        });
        get().saveGame();
    },

    // ── PASTOR BLESS ──────────────────────────────────────────────────────
    pastorBless: (targetId: string) => {
        const { session } = get();
        if (!session) return;
        if (session.pastorHasUsedAbility) return; // Guard: one-time only

        const target = session.players.find(p => p.id === targetId);
        if (!target) return;

        const updatedPlayers = session.players.map(p =>
            p.id === targetId ? { ...p, isBlessed: true } : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                blessedPlayerId: targetId,
                pastorHasUsedAbility: true,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'PASTOR_BLESS',
            message: `Mục Sư đã ban phước cho ${target.name}`,
            metadata: { roleId: 'muc_su', targetId, actionType: 'bless' },
        });

        get().saveGame();
    },

    // ── MEDIUM SCRY ───────────────────────────────────────────────────────
    mediumScry: (targetId: string) => {
        const { session } = get();
        if (!session) return;

        const target = session.players.find(p => p.id === targetId);
        if (!target) return;

        // Use SeerScanLogic to check if target is a Seer variant
        const isCorrect = target.isAlive && isSeerRole(target.roleId);

        const result = { targetId, isCorrect };

        set({
            session: {
                ...session,
                mediumLastResult: result,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'MEDIUM_SCRY',
            message: `Bà Đồng đã soi ${target.name} – ${isCorrect ? '✓ Đúng (Tiên Tri)' : '✗ Sai'}`,
            metadata: { roleId: 'ba_dong', targetId, result: isCorrect ? 'CORRECT' : 'INCORRECT' },
        });

        get().saveGame();
    },

    clearMediumResult: () => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, mediumLastResult: null, updatedAt: Date.now() } });
    },

    // ── ASSIGN TRAITOR (Kẻ Phản Bội) ────────────────────────────────────
    assignTraitor: (playerId: string) => {
        const { session } = get();
        if (!session) return;
        if (session.traitorAssigned) return; // Guard: only once

        const target = session.players.find(p => p.id === playerId);
        if (!target) return;

        const updatedPlayers = session.players.map(p =>
            p.id === playerId
                ? { ...p, isTraitor: true, traitorTeam: 'werewolf' as const }
                : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                traitorPlayerId: playerId,
                traitorAssigned: true,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'TRAITOR_ASSIGNED',
            message: `Kẻ Phản Bội đã được chỉ định (GM only)`,
            metadata: { roleId: 'ke_phan_boi', targetId: playerId },
        });

        get().saveGame();
    },

    // ── MARK BEWITCHED BITTEN (Bị Quyến) ───────────────────────────────
    markBewitchedBitten: (playerId: string, killedBy: 'werewolf' | 'vampire') => {
        const { session } = get();
        if (!session) return;

        const target = session.players.find(p => p.id === playerId);
        if (!target) return;

        const newState = killedBy === 'werewolf' ? 'TRANSFORMING_WOLF' : 'TRANSFORMING_VAMPIRE';

        const updatedPlayers = session.players.map(p =>
            p.id === playerId
                ? { ...p, bewitchedState: newState as any, bewitchedBittenBy: killedBy }
                : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'BEWITCHED_BITTEN',
            message: `Bị Quyến ${target.name} bị ${killedBy === 'werewolf' ? 'Sói' : 'Ma Cà Rồng'} cắn – sẽ biến đổi vào đêm sau`,
            metadata: { playerId, killedBy, newState },
        });

        get().saveGame();
    },

    // ── CLEAR TRANSFORMED THIS NIGHT ────────────────────────────────────
    clearTransformedThisNight: () => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, transformedThisNight: [], updatedAt: Date.now() } });
    },

    // ── RESET BLESSED STATUS ──────────────────────────────────────────────
    resetBlessedPlayers: () => {
        const { session } = get();
        if (!session) return;

        const updatedPlayers = session.players.map(p => ({ ...p, isBlessed: false }));
        set({
            session: {
                ...session,
                players: updatedPlayers,
                blessedPlayerId: null,
                updatedAt: Date.now(),
            },
        });
    },

    // ── SAVE MATCH TO HISTORY ─────────────────────────────────────────────
    saveMatchToHistory: async (winner?: string) => {
        const { session } = get();
        if (!session) return;

        try {
            // Save base match record
            await database.saveMatch(session, winner);

            // Save detailed events from matchLog
            if (database.isAvailable()) {
                const events = session.matchLog.map(entry => ({
                    round: entry.phase.number,
                    phase: entry.phase.type,
                    type: entry.type,
                    actorId: entry.metadata?.roleId ?? null,
                    targetId: entry.metadata?.targetId ?? entry.metadata?.playerId ?? null,
                    detail: entry.metadata ?? null,
                }));
                await database.saveMatchEvents(session.id, events);
            }
        } catch (err) {
            console.error('saveMatchToHistory error:', err);
        }
    },
}));
