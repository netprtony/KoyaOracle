import { NightAction, Player, Role } from '../types';
import { getRoleManager } from './RoleManager';

export interface NightResult {
    deadPlayerIds: string[];
    messages: string[];
    actionResults: Record<string, string>; // Maps roleId -> result description
}

/**
 * Resolve night actions to determine who died and other effects.
 */
export function resolveNightEvents(
    actions: NightAction[],
    players: Player[],
    roles: Role[],
    previousDeadIds: string[] = []
): NightResult {
    const roleManager = getRoleManager();
    const deadPlayerIds: string[] = [];
    const messages: string[] = [];
    const protectedPlayerIds: Set<string> = new Set();
    const killedByWerewolves: string[] = [];
    const killedByWitch: string[] = [];
    const healedByWitch: Set<string> = new Set();

    // 1. Identify protective actions first
    actions.forEach(action => {
        const role = roles.find(r => r.id === action.roleId);
        if (!role || !action.targetPlayerId) return;

        // Guard / Bao Ve
        if (role.id === 'bao_ve') {
            protectedPlayerIds.add(action.targetPlayerId);
        }

        // Witch Heal / Phu Thuy Cuu
        if (role.id === 'phu_thuy') {
            // Check if actionType is 'heal' or if it's the first target of a dual action old structure
            // With new structure, we rely on actionType
            if (action.actionType === 'heal') {
                healedByWitch.add(action.targetPlayerId);
            }
        }
    });

    // 2. Identify Kill actions
    actions.forEach(action => {
        const role = roles.find(r => r.id === action.roleId);
        if (!role || !action.targetPlayerId) return;

        const targetId = action.targetPlayerId;
        const targetPlayer = players.find(p => p.id === targetId);
        if (!targetPlayer) return;

        // Werewolf Kill / Soi
        if (role.team === 'werewolf' && role.skills?.nightAction?.type === 'kill') {
            // Check if this action is the final consensus or individual
            // For now, assume every record from a wolf role counts, 
            // but usually we should pick the last one or the group consensus.
            // GameStore currently records per-role. We might need logic here.
            // Simplified: If 'soi' role acts, it attempts to kill.

            // Check protection
            const isProtected = protectedPlayerIds.has(targetId);
            const isHealed = healedByWitch.has(targetId); // Witch heal blocks wolf kill specifically

            if (!isProtected && !isHealed) {
                // Check current state (don't kill dead people)
                if (targetPlayer.isAlive && !previousDeadIds.includes(targetId) && !killedByWerewolves.includes(targetId)) {
                    // Check specific role immunities
                    // e.g. 'muc_su' -> bless -> immortal (not implemented yet)
                    // e.g. 'thai_tu' -> survival (passive)
                    killedByWerewolves.push(targetId);
                }
            }
        }

        // Witch Kill / Phu Thuy Giet
        if (role.id === 'phu_thuy' && action.actionType === 'kill') {
            // Witch kill is usually unblockable by Guard, but maybe by some roles
            if (targetPlayer.isAlive && !previousDeadIds.includes(targetId)) {
                killedByWitch.push(targetId);
            }
        }
    });

    // Combine deaths
    // Use Set to avoid duplicates if multiple sources kill same person
    const allDeaths = new Set<string>([...killedByWerewolves, ...killedByWitch]);

    deadPlayerIds.push(...Array.from(allDeaths));

    if (deadPlayerIds.length === 0) {
        messages.push('Đêm qua bình yên, không ai chết cả.');
    } else {
        const names = players
            .filter(p => deadPlayerIds.includes(p.id))
            .map(p => p.name)
            .join(', ');
        messages.push(`Đêm qua, ${names} đã chết.`);
    }

    return {
        deadPlayerIds,
        messages,
        actionResults: {}
    };
}
