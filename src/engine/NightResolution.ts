/**
 * @legacy
 * This is the legacy night resolution logic used by the UI layer.
 * @see NightResolver for the new domain-based implementation.
 * 
 * NightResolution - Legacy night action resolution logic
 * 
 * This module provides original night resolution logic used by UI.
 * It processes night actions in a simplified manner and determines deaths.
 * 
 * NOTE: This is LEGACY implementation. The new domain layer has NightResolver
 * which uses Command Pattern. This file is kept for backward compatibility
 * with existing UI (game-master-board.tsx).
 * 
 * @see src/domain/services/NightResolver.ts for new implementation
 */

import { NightAction, Player, Role } from '../types';
import { getRoleManager } from './RoleManager';
import { PlayerStateManager } from './PlayerStateManager';
import { WitchLogic, WITCH_ROLE_ID, ACTION_HEAL, ACTION_KILL } from './logic/WitchLogic';

/**
 * Result of night resolution
 */
export interface NightResult {
    /** IDs of players who died during the night */
    deadPlayerIds: string[];
    /** Human-readable messages describing what happened */
    messages: string[];
    /** Maps roleId to result description */
    actionResults: Record<string, string>;
    /** Per-player cause map for deaths resolved this night (includes cascade deaths) */
    deathCauses?: Record<string, 'werewolf' | 'poison' | 'vampire' | 'lover_heartbreak' | 'tough_guy_scheduled'>;
    /**
     * Bị Quyến players who were bitten but survived (will transform next night).
     * The game-master-board should call markBewitchedBitten() for each entry.
     */
    bewitchedBitten?: { playerId: string; killedBy: 'werewolf' | 'vampire' }[];
    /** Thanh Niên Cứng bitten by werewolves but will die next night (GM-only persistence hook). */
    toughGuyBitten?: { playerId: string; bittenNight: number; scheduledNight: number; cause: 'werewolf' }[];
    /** True when werewolves are infected and their kill was skipped this night. */
    wolfInfectedSkip?: boolean;
}

/**
 * Resolve night actions to determine who died and other effects.
 * 
 * This function processes all night actions in a specific order:
 * 1. Protective roles (Guard)
 * 2. Werewolf attacks
 * 3. Witch actions (heal/poison)
 * 4. Calculate final deaths
 * 
 * @param actions - Array of night actions submitted by players
 * @param players - Current list of all players
 * @param roles - Available role definitions
 * @param previousDeadIds - IDs of players who were already dead (for compatibility)
 * @returns NightResult containing deaths and messages
 * 
 * @example
 * ```typescript
 * const result = resolveNightEvents(
 *   [{ roleId: 'soi', targetPlayerId: 'player1' }],
 *   players,
 *   roles
 * );
 * console.log(result.deadPlayerIds); // ['player1']
 * ```
 */
export function resolveNightEvents(
    actions: NightAction[],
    players: Player[],
    roles: Role[],
    previousDeadIds: string[] = [],
    currentNightNumber?: number,
    wolfInfectedRound?: number | null
): NightResult {
    // 1. Initialize State Manager (Ephemeral for this resolution or utilizing global singleton?)
    // Ideally we should use the existing global state manager if available, 
    // but here we might need to construct a temporary one or access the singleton.
    // For this implementation, we'll assume we access the singleton or instantiate consistent state.
    // Since `players` are passed in, we re-initialize a manager to process this specific batch of logic.
    const stateManager = new PlayerStateManager();
    // Map minimal Player interface to PlayerInput for StateManager
    stateManager.initializePlayers(players.map(p => ({
        id: p.id,
        name: p.name,
        roleId: p.roleId || '',
        team: 'villager', // Default, logic should ideally pull from real role data but strict mapping needed
        // In a real app, `players` probably contains the necessary info or we should fetch from store.
        // Assuming `p` has enough info or `roles` can help fill gaps.
    } as any)));

    // Sync alive status from params
    players.forEach(p => {
        if (!p.isAlive || previousDeadIds.includes(p.id)) {
            stateManager.killPlayer(p.id);
        } else {
            // Ensure alive
            const s = stateManager.getState(p.id);
            if (s) s.isAlive = true;
        }
    });

    // 2. Setup Logic Handlers
    const witchLogic = new WitchLogic(stateManager);

    // Track temporary results
    const kills: string[] = []; // Potential deaths
    const protectedIds: Set<string> = new Set();
    const wolfTargets: string[] = [];
    const vampireTargets: string[] = [];

    const messages: string[] = [];

    // 0. Process scheduled deaths (Thanh Niên Cứng) due at the start of this night
    const scheduledDueIds: string[] = [];
    if (typeof currentNightNumber === 'number') {
        for (const p of players) {
            if (!p.isAlive || previousDeadIds.includes(p.id)) continue;
            if (p.roleId === 'thanh_nien_cung' && (p as any).scheduledDeathNight === currentNightNumber) {
                scheduledDueIds.push(p.id);
            }
        }
    }

    // 3. Filter Valid Actions (Source must be alive)
    const validActions = actions.filter(action => {
        // Find player with this role
        // Note: This relies on 1-to-1 role mapping or 'roleId' being the player's Role ID?
        // In NightAction, 'roleId' is the role definition ID (e.g. 'soi').
        // We need to find WHICH player performed it.
        // If actions don't have source playerId, we infer from Role?
        // Multi-player roles (Werewolves) share 'soi'.
        // Single-player roles (Witch) are unique.

        // Use `getPlayersByRole` logic if Action doesn't have sourceId.
        // However, `NightAction` definition in `types/index.ts` does NOT have sourceId.
        // This is a limitation. We assume actions passed here are legit inputs from the UI 
        // which hopefully filtered dead people. 
        // BUT logic engine must enforce.

        // We can't strictly enforce "source is alive" without knowing 'sourceId'.
        // We will assume 'validActions' are from allowed players relative to the Engine's caller.
        // OR we try to find the player by Role ID if unique.

        const possibleActors = players.filter(p => p.roleId === action.roleId);
        // If all possible actors for this role are dead, action is invalid.
        const anyAlive = possibleActors.some(p => p.isAlive && !previousDeadIds.includes(p.id));
        return anyAlive;
    });

    // 4. Process Protective Roles (Guard)
    validActions.forEach(action => {
        if (action.roleId === 'bao_ve' && action.targetPlayerId) {
            protectedIds.add(action.targetPlayerId);
            stateManager.setProtected(action.targetPlayerId, true);
        }
    });

    // 5. Process Werewolf Vote/Action
    // Assuming Werewolf action is unified or singular 'kill' action
    const wolfAction = validActions.find(
        a => roles.find(r => r.id === a.roleId)?.team === 'werewolf' && (a.actionType === 'kill' || !a.actionType)
    );

    let wolfInfectedSkip = false;
    if (wolfAction && wolfAction.targetPlayerId) {
        if (typeof currentNightNumber === 'number' && wolfInfectedRound === currentNightNumber) {
            wolfInfectedSkip = true;
            messages.push('🐺 Bầy Sói bị nhiễm bệnh và không thể cắn trong đêm nay.');
        } else {
            const targetId = wolfAction.targetPlayerId;
            const targetState = stateManager.getState(targetId);

            // Wolves can't kill dead people
            if (targetState && targetState.isAlive) {
                // Check protection
                if (!stateManager.getState(targetId)?.isProtected) {
                    wolfTargets.push(targetId);
                }
            }
        }
    }

    const vampireAction = validActions.find(
        a => roles.find(r => r.id === a.roleId)?.team === 'vampire' && (a.actionType === 'kill' || !a.actionType)
    );

    if (vampireAction && vampireAction.targetPlayerId) {
        const targetId = vampireAction.targetPlayerId;
        const targetState = stateManager.getState(targetId);
        if (targetState && targetState.isAlive && !stateManager.getState(targetId)?.isProtected) {
            vampireTargets.push(targetId);
        }
    }

    // 6. Process Witch Actions
    // Witch must be looked up to verify ability usage
    const witchPlayer = players.find(p => p.roleId === WITCH_ROLE_ID);

    if (witchPlayer && witchPlayer.isAlive && !previousDeadIds.includes(witchPlayer.id)) {
        // Find Witch actions
        const witchActions = validActions.filter(a => a.roleId === WITCH_ROLE_ID);

        witchActions.forEach(action => {
            const type = (action.actionType || 'unknown') as 'heal' | 'kill';

            // Check if witch has used this ability
            // Since we re-initialized stateManager, we don't have historical usage.
            // WE NEED TO PERSIST USAGE. 
            // In this function scope, we can't easily read external persistence unless passed in.
            // Assumption: The `players` or `state` passed in SHOULD have info, but `Player` interface is slim.

            // FIXME: Usage tracking requires persistent state. 
            // For now, we assume `actions` are new attempts. 
            // We'll perform logic validation assuming "User hasn't used it before" 
            // OR rely on the `action` containing a flag?
            // "GameEngine" calls this. We should probably return "Witch used potion" in results 
            // so GameEngine can update the persistent store.

            if (type === ACTION_HEAL) {
                // Validate: Must have wolf target
                if (wolfTargets.length > 0 && action.targetPlayerId) {
                    // Start 'Heal' logic
                    // If target is in wolfTargets, remove them from death list
                    const targetIndex = wolfTargets.indexOf(action.targetPlayerId);
                    if (targetIndex > -1) {
                        // SUCCESSFUL SAVE
                        wolfTargets.splice(targetIndex, 1);
                        messages.push('Phù thủy đã dùng bình cứu người.');
                    }
                }
            } else if (type === ACTION_KILL) {
                if (action.targetPlayerId) {
                    const target = stateManager.getState(action.targetPlayerId);
                    if (target && target.isAlive) {
                        kills.push(action.targetPlayerId);
                        messages.push('Phù thủy đã dùng bình giết người.');
                    }
                }
            }
        });
    }

    // 7. Consolidate Deaths
    // Wolf Targets + Witch Kills
    const poisonTargets = [...kills];

    // Thanh Niên Cứng delayed death (only for werewolf kill, only if not already scheduled)
    const delayedToughGuyCandidates: string[] = [];
    const immediateWolfKills: string[] = [];
    wolfTargets.forEach(id => {
        const target = players.find(p => p.id === id);
        const isToughGuy = target?.roleId === 'thanh_nien_cung';
        const alreadyScheduled = !!(target as any)?.scheduledDeathNight;
        const alsoPoisoned = poisonTargets.includes(id);

        if (isToughGuy && !alreadyScheduled && !alsoPoisoned && typeof currentNightNumber === 'number') {
            delayedToughGuyCandidates.push(id);
        } else {
            immediateWolfKills.push(id);
        }
    });

    let finalDeaths = [...new Set([...immediateWolfKills, ...poisonTargets, ...vampireTargets])];

    // Step 7b – Bị Quyến (Bewitched / bi_quyen) immunity
    // If bi_quyen with state VILLAGER (or unset) is in the death list,
    // they survive but start transforming instead.
    const bewitchedBitten: { playerId: string; killedBy: 'werewolf' | 'vampire' }[] = [];

    const processBewitched = (ids: string[], killedBy: 'werewolf' | 'vampire') => {
        ids.forEach(id => {
            const player = players.find(p => p.id === id);
            if (!player) return;
            const bewitchedState = (player as any).bewitchedState as string | undefined;
            if (
                player.roleId === 'bi_quyen' &&
                (!bewitchedState || bewitchedState === 'VILLAGER')
            ) {
                bewitchedBitten.push({ playerId: id, killedBy });
            }
        });
    };

    processBewitched(wolfTargets, 'werewolf');
    processBewitched(kills.filter(id => !wolfTargets.includes(id)), 'werewolf'); // witch poison
    processBewitched(vampireTargets, 'vampire');

    if (bewitchedBitten.length > 0) {
        const names = bewitchedBitten
            .map(b => players.find(p => p.id === b.playerId)?.name ?? b.playerId)
            .join(', ');
        messages.push(`${names} bị cắn nhưng không chết – đang biến đổi thành sinh vật mới...`);
        const bIds = bewitchedBitten.map(b => b.playerId);
        finalDeaths = finalDeaths.filter(id => !bIds.includes(id));
    }

    // 8. Remove players blessed by Pastor (immune to ALL night kills)
    const blessedIds = players
        .filter(p => (p as any).isBlessed === true)
        .map(p => p.id);

    if (blessedIds.length > 0) {
        const savedNames = players
            .filter(p => blessedIds.includes(p.id) && finalDeaths.includes(p.id))
            .map(p => p.name);

        // NOTE: Scheduled deaths (TNC) should NOT be prevented by blessing.
        // Blessing only affects deaths from current-night attacks.
        finalDeaths = finalDeaths.filter(id => !blessedIds.includes(id));

        if (savedNames.length > 0) {
            messages.push(`${savedNames.join(', ')} được Mục Sư ban phước – thoát chết đêm nay.`);
        }
    }

    // 9. Add scheduled deaths back in (cannot be prevented by night protection)
    if (scheduledDueIds.length > 0) {
        const scheduledSet = new Set(scheduledDueIds);
        finalDeaths = [...scheduledDueIds, ...finalDeaths.filter(id => !scheduledSet.has(id))];
    }

    // 10. Lovers death-link (linked fate) cascade
    // IMPORTANT: Only expand from deaths that survived protection filters.
    const deathCauses: Record<string, 'werewolf' | 'poison' | 'vampire' | 'lover_heartbreak' | 'tough_guy_scheduled'> = {};
    const scheduledSet = new Set(scheduledDueIds);
    const initialQueue: Array<{ id: string; cause: 'werewolf' | 'poison' | 'vampire' | 'tough_guy_scheduled' }> = [];

    for (const id of finalDeaths) {
        const baseCause = scheduledSet.has(id)
            ? 'tough_guy_scheduled'
            : poisonTargets.includes(id)
                ? 'poison'
                : vampireTargets.includes(id)
                    ? 'vampire'
                    : 'werewolf';

        deathCauses[id] = baseCause;
        initialQueue.push({ id, cause: baseCause });
    }

    const orderedDeaths: string[] = [];
    const deathSet = new Set<string>();
    const queue: Array<{ id: string; cause: typeof deathCauses[string] }> = [...initialQueue];

    while (queue.length > 0) {
        const next = queue.shift()!;
        if (deathSet.has(next.id)) continue;

        const player = players.find(p => p.id === next.id);
        if (!player || !player.isAlive || previousDeadIds.includes(player.id)) continue;

        deathSet.add(player.id);
        orderedDeaths.push(player.id);

        // Preserve existing cause if it was set earlier
        if (!deathCauses[player.id]) {
            deathCauses[player.id] = next.cause as any;
        }

        // Trigger lover death-link (one-way cause guard is implicit via deathSet)
        if ((player as any).isLover && (player as any).loverId) {
            const partnerId = (player as any).loverId as string;
            const partner = players.find(p => p.id === partnerId);
            if (partner && partner.isAlive && !previousDeadIds.includes(partner.id) && !deathSet.has(partner.id)) {
                if (!deathCauses[partner.id]) {
                    deathCauses[partner.id] = 'lover_heartbreak';
                }
                queue.push({ id: partner.id, cause: 'lover_heartbreak' });
            }
        }
    }

    // Replace finalDeaths with the cascade-expanded set (stable order)
    finalDeaths = orderedDeaths;

    // 11. Compute Tough Guy bitten list (only those who survived after cascade)
    const toughGuyBitten: { playerId: string; bittenNight: number; scheduledNight: number; cause: 'werewolf' }[] = [];
    if (typeof currentNightNumber === 'number') {
        const stillAliveAfterCascade = new Set(players.filter(p => p.isAlive).map(p => p.id));
        for (const id of delayedToughGuyCandidates) {
            // Must not die tonight (e.g. via lover heartbreak or poison)
            if (deathSet.has(id)) continue;
            if (!stillAliveAfterCascade.has(id) || previousDeadIds.includes(id)) continue;
            toughGuyBitten.push({
                playerId: id,
                bittenNight: currentNightNumber,
                scheduledNight: currentNightNumber + 1,
                cause: 'werewolf',
            });
        }
    }

    if (finalDeaths.length === 0) {
        messages.push('Đêm qua bình yên, không ai chết cả.');
    } else {
        for (const id of finalDeaths) {
            const p = players.find(pl => pl.id === id);
            if (!p) continue;
            const cause = deathCauses[id];
            if (cause === 'lover_heartbreak') {
                const partnerName = players.find(pl => pl.id === (p as any).loverId)?.name;
                messages.push(`💔 ${p.name} chết vì đau khổ khi mất đi người yêu${partnerName ? ` ${partnerName}` : ''}.`);
            } else if (cause === 'tough_guy_scheduled') {
                const bittenNight = (p as any).toughGuyBittenNight;
                messages.push(
                    `💀⏱ ${p.name} đã gục ngã${typeof bittenNight === 'number' ? ` (bị cắn từ đêm ${bittenNight})` : ''}.`
                );
            } else if (cause === 'poison') {
                messages.push(`☠️ ${p.name} đã chết — bị đầu độc.`);
            } else if (cause === 'vampire') {
                messages.push(`🩸 ${p.name} đã chết — bị Ma Cà Rồng hút máu.`);
            } else {
                messages.push(`💀 ${p.name} đã chết — bị Sói cắn.`);
            }
        }
    }

    return {
        deadPlayerIds: finalDeaths,
        messages,
        actionResults: {
            // Can be populated with specific details if needed
        },
        deathCauses,
        bewitchedBitten: bewitchedBitten.length > 0 ? bewitchedBitten : undefined,
        toughGuyBitten: toughGuyBitten.length > 0 ? toughGuyBitten : undefined,
        wolfInfectedSkip,
    };
}
