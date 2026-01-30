import { NightAction, Player, Role } from '../types';
import { getRoleManager } from './RoleManager';
import { PlayerStateManager } from './PlayerStateManager';
import { WitchLogic, WITCH_ROLE_ID, ACTION_HEAL, ACTION_KILL } from './logic/WitchLogic';

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
    previousDeadIds: string[] = [] // Kept for interface compatibility, but StateManager is better
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

    const messages: string[] = [];

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

    if (wolfAction && wolfAction.targetPlayerId) {
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
    const finalDeaths = [...new Set([...wolfTargets, ...kills])];

    if (finalDeaths.length === 0) {
        messages.push('Đêm qua bình yên, không ai chết cả.');
    } else {
        const names = players
            .filter(p => finalDeaths.includes(p.id))
            .map(p => p.name)
            .join(', ');
        messages.push(`Đêm qua, ${names} đã chết.`);
    }

    return {
        deadPlayerIds: finalDeaths,
        messages,
        actionResults: {
            // Can be populated with specific details if needed
        }
    };
}
