/**
 * WitchLogic - Specialized logic handler for Witch role (Phù Thủy)
 * 
 * Manages the Witch's unique abilities:
 * - Potion of Life (heal): Save a werewolf victim (one-time use)
 * - Potion of Death (poison): Kill any player (one-time use)
 * 
 * This logic is used by the legacy NightResolution system.
 */

import { PlayerStateManager, EnhancedPlayerState } from '../PlayerStateManager';
import { NightAction } from '../../types';

/** Role ID for Witch (Phù Thủy) */
export const WITCH_ROLE_ID = 'phu_thuy';
/** Action type for healing */
export const ACTION_HEAL = 'heal';
/** Action type for poisoning */
export const ACTION_KILL = 'kill';

/**
 * Witch Logic Handler
 * Manages the specific rules for the Potion of Life and Potion of Death.
 */
export class WitchLogic {
    private stateManager: PlayerStateManager;

    constructor(stateManager: PlayerStateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Checks if the Witch can use a specific potion.
     */
    canUsePotion(witchPlayerId: string, actionType: 'heal' | 'kill'): boolean {
        const state = this.stateManager.getState(witchPlayerId);
        if (!state) return false;

        // Must be alive and valid role
        if (!state.isAlive || state.roleId !== WITCH_ROLE_ID) return false;

        // Check availability
        return !state.usedAbilities.has(actionType);
    }

    /**
     * Validates a Witch's action against the current context (e.g., who is dying).
     * @param action The night action performed by the witch
     * @param werewolfVictims List of player IDs targeted by werewolves this night
     */
    validateAction(action: NightAction, werewolfVictims: string[]): boolean {
        // Double check role
        if (action.roleId !== WITCH_ROLE_ID) return false;

        // Determine type (defaulting or checking explicit type)
        const type = action.actionType as 'heal' | 'kill';
        if (!type || (type !== ACTION_HEAL && type !== ACTION_KILL)) return false; // Invalid action type

        // Dead players can't act (already handled by engine, but safe to re-check)
        // We assume 'action.playerid' isn't explicitly physically passed here, 
        // usually we find the witch player by roleId from the state manager context.
        // But `NightAction` doesn't have `sourcePlayerId`. 
        // We must rely on the engine filtering acts from available actors.

        // Logic Rule: Heal only works if there is a victim.
        if (type === ACTION_HEAL) {
            if (werewolfVictims.length === 0) {
                // No victim to save. Action is technically "valid" to attempt, but invalid to succeed/count?
                // User requirement: "Save Action: Only triggered if there is a pending victim".
                // If the UI sends a Save action when there are no victims, it's invalid.
                return false;
            }
            // Logic Rule: The target must be one of the victims. 
            // "Save" implies saving the victim.
            if (!action.targetPlayerId || !werewolfVictims.includes(action.targetPlayerId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Records the usage of a potion.
     */
    markPotionUsed(witchPlayerId: string, actionType: 'heal' | 'kill'): void {
        this.stateManager.useAbility(witchPlayerId, actionType);
    }
}
