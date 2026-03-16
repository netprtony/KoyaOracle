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

function buildSpecialRolePointers(players: Player[]) {
    return {
        duConPlayerId: players.find(p => p.roleId === 'du_con')?.id ?? null,
        grandmaPlayerId: players.find(p => p.roleId === 'ba_ngoai')?.id ?? null,
        redRidingHoodPlayerId: players.find(p => p.roleId === 'khan_do')?.id ?? null,
        doppelgangerPlayerId: players.find(p => p.roleId === 'nhan_ban')?.id ?? null,
    };
}

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

        // Initialize runtime overrides for special roles
        players = players.map(p =>
            p.roleId === 'bi_quyen'
                ? { ...p, bewitchedState: 'VILLAGER' as const }
                : p.roleId === 'nhan_ban'
                    ? { ...p, teamOverride: 'villager' as const }
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
            loversAssigned: false,
            lover1Id: null,
            lover2Id: null,
            cupidPlayerId: null,
            scheduledDeaths: [],
            cultLeaderPlayerId: null,
            cultMemberIds: [],
            ...buildSpecialRolePointers(players),
            duConTarget1Id: null,
            duConTarget2Id: null,
            duConTarget1Dead: false,
            duConTarget2Dead: false,
            duConAbilityUsed: false,
            redRidingHoodPowerUnlocked: false,
            redRidingHoodUnlockRound: null,
            redRidingHoodRevealedWolves: [],
            redRidingHoodLastReveal: null,
            wolfInfectedRound: null,
            doppelgangerTargetId: null,
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

        const updatedPlayers = session.players.map((player) => {
            if (player.id !== playerId) return player;
            if (roleId === 'nhan_ban') {
                return { ...player, roleId, teamOverride: 'villager', doppelgangerActivated: false, doppelgangerInheritedRole: null };
            }
            return { ...player, roleId };
        });

        const pointers = buildSpecialRolePointers(updatedPlayers);

        set({
            session: {
                ...session,
                players: updatedPlayers,
                ...pointers,
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
        const nextWolfInfectedRound = session.wolfInfectedRound === session.currentPhase.number
            ? null
            : session.wolfInfectedRound;

        set({
            session: {
                ...session,
                currentPhase: newPhase,
                wolfInfectedRound: nextWolfInfectedRound,
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

        type InternalCause = 'execution' | 'lover_heartbreak';

        const causeById: Record<string, InternalCause> = { [playerId]: 'execution' };
        const order: string[] = [];
        const deadSet = new Set<string>();
        const queue: string[] = [playerId];

        while (queue.length > 0) {
            const id = queue.shift()!;
            if (deadSet.has(id)) continue;
            const p = session.players.find(x => x.id === id);
            if (!p || !p.isAlive) continue;

            deadSet.add(id);
            order.push(id);

            // Lovers death-link
            if (p.isLover && p.loverId) {
                const partner = session.players.find(x => x.id === p.loverId);
                if (partner && partner.isAlive && !deadSet.has(partner.id)) {
                    if (!causeById[partner.id]) causeById[partner.id] = 'lover_heartbreak';
                    queue.push(partner.id);
                }
            }
        }

        const updatedPlayers = session.players.map(p => {
            if (!deadSet.has(p.id)) return p;
            const internal = causeById[p.id] ?? 'execution';
            const killedBy = internal === 'lover_heartbreak' ? ('other' as const) : ('execution' as const);
            const next: Player = {
                ...p,
                isAlive: false,
                killedBy,
            };

            // Cleanup Tough Guy scheduled death if they die before/at schedule
            if (next.roleId === 'thanh_nien_cung' && (next as any).scheduledDeathNight != null) {
                (next as any).scheduledDeathNight = null;
                (next as any).toughGuyBittenNight = null;
                (next as any).scheduledDeathCause = null;
            }

            return next;
        });

        const cleanedScheduledDeaths = (session.scheduledDeaths ?? []).filter(d => !deadSet.has(d.playerId));

        set({
            session: {
                ...session,
                players: updatedPlayers,
                scheduledDeaths: cleanedScheduledDeaths,
                updatedAt: Date.now(),
            },
        });

        // Primary lynch log
        get().addLogEntry({
            type: 'LYNCH',
            message: `${player.name} đã bị treo cổ`,
            metadata: { playerId },
        });

        // Heartbreak logs (if any)
        for (const id of order) {
            if (id === playerId) continue;
            if (causeById[id] !== 'lover_heartbreak') continue;
            const p = session.players.find(x => x.id === id);
            if (!p) continue;
            const partnerName = session.players.find(x => x.id === p.loverId)?.name;
            get().addLogEntry({
                type: 'LOVER_BROKEN_HEART',
                message: `💔 ${p.name} chết vì đau khổ khi mất đi người yêu${partnerName ? ` ${partnerName}` : ''}`,
                metadata: { playerId: id, deceasedPartnerId: p.loverId },
            });
        }

        get().saveGame();
    },


    // Process night deaths
    processNightDeaths: (playerIds: string[], deathCauses) => {
        const { session, availableRoles } = get();
        if (!session || playerIds.length === 0) return;

        type InternalCause = 'werewolf' | 'poison' | 'vampire' | 'execution' | 'hunter' | 'other' | 'lover_heartbreak' | 'tough_guy_scheduled';
        const causeById: Record<string, InternalCause> = {};
        playerIds.forEach(id => {
            const c = deathCauses?.[id] as InternalCause | undefined;
            causeById[id] = c ?? 'werewolf';
        });

        // Expand with Lovers death-link (safety net: even if caller didn't include partner)
        const order: string[] = [];
        const deadSet = new Set<string>();
        const queue: string[] = [...playerIds];

        while (queue.length > 0) {
            const id = queue.shift()!;
            if (deadSet.has(id)) continue;
            const p = session.players.find(x => x.id === id);
            if (!p || !p.isAlive) continue;

            deadSet.add(id);
            order.push(id);

            if (p.isLover && p.loverId) {
                const partner = session.players.find(x => x.id === p.loverId);
                if (partner && partner.isAlive && !deadSet.has(partner.id)) {
                    if (!causeById[partner.id]) causeById[partner.id] = 'lover_heartbreak';
                    queue.push(partner.id);
                }
            }
        }

        const mapToKilledBy = (c: InternalCause): Player['killedBy'] => {
            switch (c) {
                case 'werewolf':
                case 'tough_guy_scheduled':
                    return 'werewolf';
                case 'poison':
                    return 'poison';
                case 'vampire':
                    return 'vampire';
                case 'execution':
                    return 'execution';
                case 'hunter':
                    return 'hunter';
                case 'lover_heartbreak':
                case 'other':
                default:
                    return 'other';
            }
        };

        let updatedPlayers = session.players.map(p => {
            if (!deadSet.has(p.id)) return p;
            const internal = causeById[p.id] ?? 'werewolf';
            const next: Player = {
                ...p,
                isAlive: false,
                killedBy: mapToKilledBy(internal),
            };

            // Cleanup Tough Guy scheduled death if they die before/at schedule
            if (next.roleId === 'thanh_nien_cung' && (next as any).scheduledDeathNight != null) {
                (next as any).scheduledDeathNight = null;
                (next as any).toughGuyBittenNight = null;
                (next as any).scheduledDeathCause = null;
            }

            return next;
        });

        let pastorHasUsedAbility = session.pastorHasUsedAbility;
        let redRidingHoodPowerUnlocked = session.redRidingHoodPowerUnlocked ?? false;
        let redRidingHoodUnlockRound = session.redRidingHoodUnlockRound ?? null;
        const currentRound = session.currentPhase.number;
        let wolfInfectedRound = session.wolfInfectedRound === currentRound ? null : (session.wolfInfectedRound ?? null);

        const duConTarget1Dead = (session.duConTarget1Dead ?? false) ||
            (!!session.duConTarget1Id && deadSet.has(session.duConTarget1Id));
        const duConTarget2Dead = (session.duConTarget2Dead ?? false) ||
            (!!session.duConTarget2Id && deadSet.has(session.duConTarget2Id));

        let grandmaUnlockedThisNight = false;
        let sickTriggeredThisNight = false;
        let doppelgangerInheritedEvent: { actorId: string; targetId: string; inheritedRole: string } | null = null;

        for (const id of order) {
            const deadPlayer = session.players.find(p => p.id === id);
            if (!deadPlayer) continue;
            const cause = causeById[id] ?? 'werewolf';

            if (deadPlayer.roleId === 'ba_ngoai' && cause === 'werewolf') {
                redRidingHoodPowerUnlocked = true;
                redRidingHoodUnlockRound = currentRound;
                grandmaUnlockedThisNight = true;
            }

            if (deadPlayer.roleId === 'nguoi_benh' && cause === 'werewolf') {
                wolfInfectedRound = currentRound + 1;
                sickTriggeredThisNight = true;
            }

            if (
                session.doppelgangerTargetId &&
                id === session.doppelgangerTargetId &&
                session.doppelgangerPlayerId
            ) {
                const dop = updatedPlayers.find(p => p.id === session.doppelgangerPlayerId);
                if (dop && dop.isAlive) {
                    let inheritedRole = deadPlayer.roleId || 'dan_lang';
                    if (inheritedRole === 'nhan_ban') {
                        inheritedRole = 'dan_lang';
                    }
                    const inheritedTeam = availableRoles.find(r => r.id === inheritedRole)?.team ?? 'villager';

                    updatedPlayers = updatedPlayers.map(p =>
                        p.id === dop.id
                            ? {
                                ...p,
                                roleId: inheritedRole,
                                teamOverride: inheritedTeam,
                                doppelgangerActivated: true,
                                doppelgangerInheritedRole: inheritedRole,
                            }
                            : p
                    );

                    if (inheritedRole === 'muc_su') {
                        pastorHasUsedAbility = false;
                    }

                    doppelgangerInheritedEvent = {
                        actorId: dop.id,
                        targetId: deadPlayer.id,
                        inheritedRole,
                    };
                }
            }
        }

        const cleanedScheduledDeaths = (session.scheduledDeaths ?? []).filter(d => !deadSet.has(d.playerId));

        set({
            session: {
                ...session,
                players: updatedPlayers,
                scheduledDeaths: cleanedScheduledDeaths,
                duConTarget1Dead,
                duConTarget2Dead,
                redRidingHoodPowerUnlocked,
                redRidingHoodUnlockRound,
                wolfInfectedRound,
                pastorHasUsedAbility,
                updatedAt: Date.now(),
            },
        });

        // Add log for each death (with causes)
        order.forEach(id => {
            const p = session.players.find(x => x.id === id);
            if (!p) return;
            const internal = causeById[id] ?? 'werewolf';

            if (internal === 'lover_heartbreak') {
                const partnerName = session.players.find(x => x.id === p.loverId)?.name;
                get().addLogEntry({
                    type: 'LOVER_BROKEN_HEART',
                    message: `💔 ${p.name} chết vì đau khổ khi mất đi người yêu${partnerName ? ` ${partnerName}` : ''}`,
                    metadata: { playerId: id, deceasedPartnerId: p.loverId },
                });
                return;
            }

            if (internal === 'tough_guy_scheduled') {
                get().addLogEntry({
                    type: 'TOUGH_GUY_DIED',
                    message: `💀⏱ ${p.name} đã gục ngã sau khi chiến đấu tới hơi thở cuối cùng`,
                    metadata: {
                        playerId: id,
                        bittenNight: (p as any).toughGuyBittenNight,
                        deathNight: session.currentPhase?.number,
                    },
                });
                return;
            }

            const causeMessages = {
                execution: 'bị treo cổ',
                werewolf: 'bị sói cắn',
                poison: 'bị đầu độc',
                hunter: 'bị thợ săn bắn',
                vampire: 'bị ma cà rồng hút máu',
                other: 'đã chết'
            };

            const killedBy = mapToKilledBy(internal);
            get().addLogEntry({
                type: 'DEATH',
                message: `${p.name} ${causeMessages[killedBy]}`,
                metadata: { playerId: id, cause: killedBy },
            });
        });

        if (grandmaUnlockedThisNight) {
            get().addLogEntry({
                type: 'RED_RIDING_HOOD_UNLOCKED',
                message: '👵 Bà Ngoại bị Sói giết - Khăn Đỏ mở khóa sức mạnh từ đêm sau.',
                metadata: { round: currentRound },
            });
        }

        if (sickTriggeredThisNight) {
            get().addLogEntry({
                type: 'SICK_PERSON_KILLED',
                message: '🤒 Người Bệnh bị Sói cắn - bầy Sói sẽ bỏ lượt cắn ở đêm tiếp theo.',
                metadata: { round: currentRound, wolfInfectedRound },
            });
        }

        if (doppelgangerInheritedEvent) {
            get().addLogEntry({
                type: 'DOPPELGANGER_INHERITED',
                message: '👥 Nhân Bản đã kế thừa vai trò của mục tiêu đã chết.',
                metadata: doppelgangerInheritedEvent,
            });
        }

        get().saveGame();
    },

    // Process death with specific cause (for hunter, poison, vampire, etc.)
    processDeathWithCause: (playerId: string, cause: 'execution' | 'werewolf' | 'poison' | 'hunter' | 'vampire' | 'other') => {
        const { session, availableRoles } = get();
        if (!session) return;

        const player = session.players.find(p => p.id === playerId);
        if (!player) return;

        type InternalCause = typeof cause | 'lover_heartbreak';
        const causeById: Record<string, InternalCause> = { [playerId]: cause };
        const order: string[] = [];
        const deadSet = new Set<string>();
        const queue: string[] = [playerId];

        while (queue.length > 0) {
            const id = queue.shift()!;
            if (deadSet.has(id)) continue;
            const p = session.players.find(x => x.id === id);
            if (!p || !p.isAlive) continue;

            deadSet.add(id);
            order.push(id);

            if (p.isLover && p.loverId) {
                const partner = session.players.find(x => x.id === p.loverId);
                if (partner && partner.isAlive && !deadSet.has(partner.id)) {
                    if (!causeById[partner.id]) causeById[partner.id] = 'lover_heartbreak';
                    queue.push(partner.id);
                }
            }
        }

        let updatedPlayers = session.players.map(p => {
            if (!deadSet.has(p.id)) return p;
            const internal = causeById[p.id] ?? cause;
            const killedBy = internal === 'lover_heartbreak' ? ('other' as const) : (internal as Player['killedBy']);
            const next: Player = { ...p, isAlive: false, killedBy };

            if (next.roleId === 'thanh_nien_cung' && (next as any).scheduledDeathNight != null) {
                (next as any).scheduledDeathNight = null;
                (next as any).toughGuyBittenNight = null;
                (next as any).scheduledDeathCause = null;
            }

            return next;
        });

        let pastorHasUsedAbility = session.pastorHasUsedAbility;
        let redRidingHoodPowerUnlocked = session.redRidingHoodPowerUnlocked ?? false;
        let redRidingHoodUnlockRound = session.redRidingHoodUnlockRound ?? null;
        let wolfInfectedRound = session.wolfInfectedRound ?? null;
        const currentRound = session.currentPhase.number;

        const duConTarget1Dead = (session.duConTarget1Dead ?? false) ||
            (!!session.duConTarget1Id && deadSet.has(session.duConTarget1Id));
        const duConTarget2Dead = (session.duConTarget2Dead ?? false) ||
            (!!session.duConTarget2Id && deadSet.has(session.duConTarget2Id));

        let grandmaUnlocked = false;
        let sickTriggered = false;
        let doppelgangerInheritedEvent: { actorId: string; targetId: string; inheritedRole: string } | null = null;

        for (const id of order) {
            const deadPlayer = session.players.find(p => p.id === id);
            if (!deadPlayer) continue;
            const internal = causeById[id] ?? cause;

            if (deadPlayer.roleId === 'ba_ngoai' && internal === 'werewolf') {
                redRidingHoodPowerUnlocked = true;
                redRidingHoodUnlockRound = currentRound;
                grandmaUnlocked = true;
            }

            if (deadPlayer.roleId === 'nguoi_benh' && internal === 'werewolf') {
                wolfInfectedRound = currentRound + 1;
                sickTriggered = true;
            }

            if (
                session.doppelgangerTargetId &&
                id === session.doppelgangerTargetId &&
                session.doppelgangerPlayerId
            ) {
                const dop = updatedPlayers.find(p => p.id === session.doppelgangerPlayerId);
                if (dop && dop.isAlive) {
                    let inheritedRole = deadPlayer.roleId || 'dan_lang';
                    if (inheritedRole === 'nhan_ban') {
                        inheritedRole = 'dan_lang';
                    }
                    const inheritedTeam = availableRoles.find(r => r.id === inheritedRole)?.team ?? 'villager';
                    updatedPlayers = updatedPlayers.map(p =>
                        p.id === dop.id
                            ? {
                                ...p,
                                roleId: inheritedRole,
                                teamOverride: inheritedTeam,
                                doppelgangerActivated: true,
                                doppelgangerInheritedRole: inheritedRole,
                            }
                            : p
                    );

                    if (inheritedRole === 'muc_su') {
                        pastorHasUsedAbility = false;
                    }

                    doppelgangerInheritedEvent = {
                        actorId: dop.id,
                        targetId: deadPlayer.id,
                        inheritedRole,
                    };
                }
            }
        }

        const cleanedScheduledDeaths = (session.scheduledDeaths ?? []).filter(d => !deadSet.has(d.playerId));

        set({
            session: {
                ...session,
                players: updatedPlayers,
                scheduledDeaths: cleanedScheduledDeaths,
                duConTarget1Dead,
                duConTarget2Dead,
                redRidingHoodPowerUnlocked,
                redRidingHoodUnlockRound,
                wolfInfectedRound,
                pastorHasUsedAbility,
                updatedAt: Date.now(),
            },
        });

        const causeMessages = {
            execution: 'bị treo cổ',
            werewolf: 'bị sói cắn',
            poison: 'bị đầu độc',
            hunter: 'bị thợ săn bắn',
            vampire: 'bị ma cà rồng hút máu',
            other: 'đã chết'
        };

        // Log entries
        order.forEach(id => {
            const p = session.players.find(x => x.id === id);
            if (!p) return;
            const internal = causeById[id] ?? cause;
            if (internal === 'lover_heartbreak') {
                const partnerName = session.players.find(x => x.id === p.loverId)?.name;
                get().addLogEntry({
                    type: 'LOVER_BROKEN_HEART',
                    message: `💔 ${p.name} chết vì đau khổ khi mất đi người yêu${partnerName ? ` ${partnerName}` : ''}`,
                    metadata: { playerId: id, deceasedPartnerId: p.loverId },
                });
                return;
            }

            get().addLogEntry({
                type: 'DEATH',
                message: `${p.name} ${causeMessages[(internal as Player['killedBy']) ?? 'other']}`,
                metadata: { playerId: id, cause: (internal as Player['killedBy']) ?? 'other' },
            });
        });

        if (grandmaUnlocked) {
            get().addLogEntry({
                type: 'RED_RIDING_HOOD_UNLOCKED',
                message: '👵 Bà Ngoại bị Sói giết - Khăn Đỏ mở khóa sức mạnh từ đêm sau.',
                metadata: { round: currentRound },
            });
        }

        if (sickTriggered) {
            get().addLogEntry({
                type: 'SICK_PERSON_KILLED',
                message: '🤒 Người Bệnh bị Sói cắn - bầy Sói sẽ bỏ lượt cắn ở đêm tiếp theo.',
                metadata: { round: currentRound, wolfInfectedRound },
            });
        }

        if (doppelgangerInheritedEvent) {
            get().addLogEntry({
                type: 'DOPPELGANGER_INHERITED',
                message: '👥 Nhân Bản đã kế thừa vai trò của mục tiêu đã chết.',
                metadata: doppelgangerInheritedEvent,
            });
        }

        get().saveGame();
    },

    markToughGuyBitten: (playerId: string, bittenNight: number, scheduledNight: number) => {
        const { session } = get();
        if (!session) return;

        const target = session.players.find(p => p.id === playerId);
        if (!target || !target.isAlive) return;

        // Only applies to Thanh Niên Cứng and only if not already scheduled
        if (target.roleId !== 'thanh_nien_cung') return;
        if ((target as any).scheduledDeathNight != null) return;

        const updatedPlayers = session.players.map(p =>
            p.id === playerId
                ? {
                    ...p,
                    toughGuyBittenNight: bittenNight,
                    scheduledDeathNight: scheduledNight,
                    scheduledDeathCause: 'werewolf',
                }
                : p
        );

        const scheduledDeaths = session.scheduledDeaths ?? [];
        const exists = scheduledDeaths.some(d => d.playerId === playerId);
        const nextScheduledDeaths = exists
            ? scheduledDeaths
            : [...scheduledDeaths, { playerId, cause: 'werewolf', bittenNight, scheduledNight }];

        set({
            session: {
                ...session,
                players: updatedPlayers,
                scheduledDeaths: nextScheduledDeaths,
                updatedAt: Date.now(),
            },
        });

        // GM-only log (do not announce to players directly)
        get().addLogEntry({
            type: 'TOUGH_GUY_BITTEN',
            message: `💪 ${target.name} bị Sói cắn (đêm ${bittenNight}) nhưng sẽ gục ngã vào đêm ${scheduledNight}`,
            metadata: { playerId, bittenNight, scheduledNight },
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

    // ── ASSIGN LOVERS (Cặp Đôi) ─────────────────────────────────────────
    assignLovers: (player1Id: string, player2Id: string) => {
        const { session } = get();
        if (!session) return;
        if (session.loversAssigned) return; // Guard: only once

        const p1 = session.players.find(p => p.id === player1Id);
        const p2 = session.players.find(p => p.id === player2Id);
        if (!p1 || !p2) return;

        // Find cupid player
        const cupid = session.players.find(p => p.roleId === 'than_tinh_yeu' && p.isAlive);

        const updatedPlayers = session.players.map(p => {
            if (p.id === player1Id) return { ...p, isLover: true, loverId: player2Id };
            if (p.id === player2Id) return { ...p, isLover: true, loverId: player1Id };
            return p;
        });

        set({
            session: {
                ...session,
                players: updatedPlayers,
                loversAssigned: true,
                lover1Id: player1Id,
                lover2Id: player2Id,
                cupidPlayerId: cupid?.id ?? null,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'LOVERS_ASSIGNED',
            message: `Thần Tình Yêu đã ghép đôi ${p1.name} & ${p2.name}`,
            metadata: { player1Id, player2Id, cupidId: cupid?.id },
        });

        get().saveGame();
    },

    // ── RECRUIT TO CULT (Chủ Giáo Phái) ─────────────────────────────────
    recruitToCult: (targetId: string) => {
        const { session } = get();
        if (!session) return;

        const currentMembers = session.cultMemberIds ?? [];
        if (currentMembers.includes(targetId)) return; // already a member

        const target = session.players.find(p => p.id === targetId);
        if (!target || !target.isAlive) return;

        // Find cult leader
        const leader = session.players.find(p => p.roleId === 'chu_giao_phai' && p.isAlive);
        if (!leader) return; // leader dead → can't recruit

        const updatedPlayers = session.players.map(p =>
            p.id === targetId ? { ...p, isCultMember: true } : p
        );

        const updatedMembers = [...currentMembers, targetId];

        set({
            session: {
                ...session,
                players: updatedPlayers,
                cultLeaderPlayerId: leader.id,
                cultMemberIds: updatedMembers,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'CULT_RECRUIT',
            message: `Chủ Giáo Phái đã kết nạp ${target.name}`,
            metadata: { targetId, round: session.currentPhase.number },
        });

        get().saveGame();
    },

    // Du Côn chọn 2 mục tiêu ở đêm đầu
    assignDuConTargets: (target1Id: string, target2Id: string) => {
        const { session } = get();
        if (!session) return;
        if (target1Id === target2Id) return;

        const actor = session.players.find(p => p.roleId === 'du_con' && p.isAlive);
        if (!actor) return;

        set({
            session: {
                ...session,
                duConPlayerId: actor.id,
                duConTarget1Id: target1Id,
                duConTarget2Id: target2Id,
                duConTarget1Dead: false,
                duConTarget2Dead: false,
                duConAbilityUsed: true,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'DUCON_TARGETS_ASSIGNED',
            message: '🏃 Du Côn đã chọn 2 mục tiêu.',
            metadata: { actorId: actor.id, target1Id, target2Id },
        });

        get().saveGame();
    },

    // Nhân Bản chọn mục tiêu sao chép ở đêm đầu
    assignDoppelgangerTarget: (targetId: string) => {
        const { session } = get();
        if (!session) return;

        const actor = session.players.find(p => p.roleId === 'nhan_ban' && p.isAlive);
        if (!actor || actor.id === targetId) return;

        const updatedPlayers = session.players.map(p =>
            p.id === actor.id ? { ...p, doppelgangerTargetId: targetId } : p
        );

        set({
            session: {
                ...session,
                players: updatedPlayers,
                doppelgangerPlayerId: actor.id,
                doppelgangerTargetId: targetId,
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'DOPPELGANGER_TARGET_ASSIGNED',
            message: '👥 Nhân Bản đã chọn mục tiêu sao chép.',
            metadata: { actorId: actor.id, targetId },
        });

        get().saveGame();
    },

    setRedRidingHoodReveal: (wolfId: string, wolfName: string) => {
        const { session } = get();
        if (!session) return;

        const revealed = session.redRidingHoodRevealedWolves ?? [];
        const nextRevealed = revealed.includes(wolfId) ? revealed : [...revealed, wolfId];

        set({
            session: {
                ...session,
                redRidingHoodRevealedWolves: nextRevealed,
                redRidingHoodLastReveal: { wolfId, wolfName },
                updatedAt: Date.now(),
            },
        });

        get().addLogEntry({
            type: 'RED_RIDING_HOOD_REVEAL',
            message: `🧺 Khăn Đỏ đã nhìn thấy một Sói: ${wolfName}`,
            metadata: { wolfId, wolfName, round: session.currentPhase.number },
        });

        get().saveGame();
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
