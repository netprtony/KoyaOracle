import { Role, Scenario, NightOrderDefinition, GameSession, Player } from '../types';
import { NightRoleQueueItem, NightActionState } from '../types/nightPhase.types';

export const WOLF_PACK_ROLES = new Set(['soi', 'soi_con', 'soi_don_doc', 'soi_trum', 'soi_an_chay']);
export const FANG_ROLE_ID = 'nanh_soi';

function getQueuePriority(roleId: string, index: number): number {
    if (roleId === 'wolf_pack') return 3;
    return 4 + index;
}

function createSkippedAction(reason: 'no_ability' | 'already_used' | 'player_skipped'): NightActionState {
    return {
        type: 'SKIPPED',
        reason,
        confirmedAt: Date.now(),
        isModified: false,
    };
}

/**
 * Get the night sequence of roles to call based on scenario
 * Only includes roles that are present in the scenario
 * Sorted by role.order
 */
export function getNightSequence(
    scenario: Scenario,
    availableRoles: Role[],
    nightNumber: number = 1,
    sessionOverrideOrder?: NightOrderDefinition,
    session?: GameSession
): Role[] {
    // Determine which order list to use
    // Priority: Session Override -> Scenario Default
    const orderDefinition = sessionOverrideOrder || scenario.nightOrder;

    // Choose list based on night number
    // Legacy support: if nightOrder is an array (shouldn't happen with types, but for safety)
    let sequenceIds: string[] = [];

    if (Array.isArray(orderDefinition)) {
        sequenceIds = orderDefinition;
    } else {
        sequenceIds = nightNumber === 1
            ? orderDefinition.firstNight
            : orderDefinition.otherNights;
    }

    const sequence: Role[] = [];

    // Filter roles that are actually in this scenario (quantity > 0)
    const activeRoleIds = new Set(
        scenario.roles
            .filter(r => r.quantity > 0)
            .map(r => r.roleId)
    );

    sequenceIds.forEach((roleId) => {
        if (roleId === 'khan_do') {
            const unlocked = session?.redRidingHoodPowerUnlocked === true;
            const unlockRound = session?.redRidingHoodUnlockRound ?? null;
            const isAlive = !!session?.players.some(p => p.roleId === 'khan_do' && p.isAlive);
            const canActThisNight = unlocked && unlockRound !== null && nightNumber > unlockRound && isAlive;
            if (!canActThisNight) {
                return;
            }
        }

        if (activeRoleIds.has(roleId)) {
            const role = availableRoles.find((r) => r.id === roleId);
            if (role) {
                sequence.push(role);
            }
        }
    });

    return sequence;
}

/**
 * Build active wolf participants for a unified wolf phase.
 * Nanh Sói only joins when all main wolves are dead.
 */
export function buildWolfPhaseParticipants(players: Player[]): Player[] {
    const alivePlayers = players.filter(player => player.isAlive);
    const primaryWolves = alivePlayers.filter(player => WOLF_PACK_ROLES.has(player.roleId || ''));
    const wolfFang = alivePlayers.find(player => player.roleId === FANG_ROLE_ID);

    if (primaryWolves.length > 0) {
        return primaryWolves;
    }

    return wolfFang ? [wolfFang] : [];
}

/**
 * Build an ordered queue for the current night with a unified wolf phase.
 */
export function initNightQueue(
    scenario: Scenario,
    availableRoles: Role[],
    nightNumber: number,
    session: GameSession,
    sessionOverrideOrder?: NightOrderDefinition
): NightRoleQueueItem[] {
    const queue: NightRoleQueueItem[] = [];
    const wolfParticipants = buildWolfPhaseParticipants(session.players);

    if (wolfParticipants.length > 0) {
        queue.push({
            roleId: 'wolf_pack',
            playerId: 'wolf_pack',
            playerName: 'Bầy Sói',
            priority: getQueuePriority('wolf_pack', 0),
            wakeCondition: 'always',
            isActive: true,
            actionState: null,
        });
    }

    const aliveWolfFang = session.players.find(player => player.roleId === FANG_ROLE_ID && player.isAlive);
    const fangIsActive = wolfParticipants.some(player => player.id === aliveWolfFang?.id);
    if (aliveWolfFang && !fangIsActive) {
        queue.push({
            roleId: FANG_ROLE_ID,
            playerId: aliveWolfFang.id,
            playerName: aliveWolfFang.name,
            priority: getQueuePriority(FANG_ROLE_ID, 0),
            wakeCondition: 'conditional',
            isActive: false,
            actionState: createSkippedAction('no_ability'),
        });
    }

    const sequence = getNightSequence(
        scenario,
        availableRoles,
        nightNumber,
        sessionOverrideOrder,
        session
    );

    sequence
        .filter(role => !WOLF_PACK_ROLES.has(role.id) && role.id !== FANG_ROLE_ID)
        .forEach((role, index) => {
            const activePlayers = session.players.filter(
                player => player.isAlive && player.roleId === role.id
            );

            activePlayers.forEach(player => {
                queue.push({
                    roleId: role.id as NightRoleQueueItem['roleId'],
                    playerId: player.id,
                    playerName: player.name,
                    priority: getQueuePriority(role.id, index),
                    wakeCondition: role.id === 'khan_do' ? 'conditional' : 'always',
                    isActive: true,
                    actionState: null,
                });
            });
        });

    return queue.sort((a, b) => a.priority - b.priority);
}

/**
 * Get the next role in the night sequence
 */
export function getNextRole(
    currentRoleId: string | null,
    nightSequence: Role[]
): Role | null {
    if (nightSequence.length === 0) return null;

    if (currentRoleId === null) {
        return nightSequence[0];
    }

    const currentIndex = nightSequence.findIndex(
        (role) => role.id === currentRoleId
    );

    if (currentIndex === -1 || currentIndex === nightSequence.length - 1) {
        return null; // End of sequence
    }

    return nightSequence[currentIndex + 1];
}

/**
 * Get the previous role in the night sequence
 */
export function getPreviousRole(
    currentRoleId: string | null,
    nightSequence: Role[]
): Role | null {
    if (nightSequence.length === 0 || currentRoleId === null) {
        return null;
    }

    const currentIndex = nightSequence.findIndex(
        (role) => role.id === currentRoleId
    );

    if (currentIndex <= 0) {
        return null; // Already at start
    }

    return nightSequence[currentIndex - 1];
}
