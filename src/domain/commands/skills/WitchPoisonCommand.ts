/**
 * WitchPoisonCommand - Command for witch poison action
 * 
 * Marks target player with POISONED status using bitwise OR operation.
 * Can only be used once per game. Causes death during night resolution.
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { PlayerStatus } from '../../entities/PlayerStatus';
import { WITCH_ROLE_ID } from '../../../engine/logic/WitchLogic';

export class WitchPoisonCommand extends BaseCommand {
    private previousTargetMask?: number;
    private previousActorMask?: number;

constructor(actorId: string, targetId: string) {
        super(actorId, WITCH_ROLE_ID, [targetId]);
    }

    get description(): string {
        const actor = this.actorId;
        const target = this.targetIds[0];
        return `Witch ${actor} poisons ${target}`;
    }

    canExecute(state: GameState): boolean {
        // Validate actor
        const actorValidation = this.validateActor(state);
        if (!actorValidation.valid) {
            return false;
        }

        const actor = this.getActor(state);
        if (!actor) {
            return false;
        }

        // Check if witch has already used poison ability
        if (actor.hasStatus(PlayerStatus.USED_POISON)) {
            return false;
        }

        // Validate target exists and is alive
        const targetValidation = this.validateTargets(state, true);
        if (!targetValidation.valid) {
            return false;
        }

        // Validate exactly one target
        const countValidation = this.validateTargetCount(1);
        if (!countValidation.valid) {
            return false;
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            return this.failureResult(state, 'Cannot execute witch poison');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Actor or target not found');
        }

        // Store previous masks for undo
        this.previousTargetMask = target.statusMask;
        this.previousActorMask = actor.statusMask;

        // Add POISONED status to target using bitwise OR
        const updatedTarget = target.addStatus(PlayerStatus.POISONED);

        // Mark witch as having used poison ability
        const updatedActor = actor.addStatus(PlayerStatus.USED_POISON);

        // Update state with both changes
        let newState = state.updatePlayer(target.id, () => updatedTarget);
        newState = newState.updatePlayer(actor.id, () => updatedActor);

        return this.successResult(
            newState,
            `Witch poisoned ${target.name}`,
            {
                targetId: target.id,
                targetName: target.name,
                previousTargetMask: this.previousTargetMask,
                newTargetMask: updatedTarget.statusMask,
                abilityUsed: 'poison'
            }
        );
    }

    undo(state: GameState): CommandResult {
        if (this.previousTargetMask === undefined || this.previousActorMask === undefined) {
            return this.failureResult(state, 'Cannot undo: no previous state');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Actor or target not found for undo');
        }

        // Restore previous masks
        const restoredTarget = target.update({ statusMask: this.previousTargetMask });
        const restoredActor = actor.update({ statusMask: this.previousActorMask });

        // Update state
        let newState = state.updatePlayer(target.id, () => restoredTarget);
        newState = newState.updatePlayer(actor.id, () => restoredActor);

        return this.successResult(
            newState,
            `Undid witch poison on ${target.name}`,
            {
                targetId: target.id,
                restoredTargetMask: this.previousTargetMask,
                restoredActorMask: this.previousActorMask
            }
        );
    }
}
