/**
 * GuardProtectCommand - Command for guard protection action
 * 
 * Marks target player with PROTECTED status using bitwise OR operation.
 * Prevents werewolf kill during night resolution.
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { PlayerStatus } from '../../entities/PlayerStatus';

export class GuardProtectCommand extends BaseCommand {
    private previousTargetMask?: number;

    constructor(actorId: string, targetId: string) {
        super(actorId, 'bao_ve', [targetId]);
    }

    get description(): string {
        const actor = this.actorId;
        const target = this.targetIds[0];
        return `Guard ${actor} protects ${target}`;
    }

    canExecute(state: GameState): boolean {
        // Validate actor
        const actorValidation = this.validateActor(state);
        if (!actorValidation.valid) {
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

        // Check restriction: cannot protect same person consecutively
        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (actor && target) {
            const lastProtected = actor.lastProtectedTargetId;
            if (lastProtected === target.id) {
                return false; // Cannot protect same person twice in a row
            }
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            return this.failureResult(state, 'Cannot execute guard protection');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Actor or target not found');
        }

        // Store previous mask for undo
        this.previousTargetMask = target.statusMask;

        // Add PROTECTED status using bitwise OR
        const updatedTarget = target.addStatus(PlayerStatus.PROTECTED);

        // Update actor's lastProtectedTargetId
        const updatedActor = actor.withMetadata({ lastProtectedTargetId: target.id });

        // Update state with both changes
        let newState = state.updatePlayer(target.id, () => updatedTarget);
        newState = newState.updatePlayer(actor.id, () => updatedActor);

        return this.successResult(
            newState,
            `Guard protected ${target.name}`,
            {
                targetId: target.id,
                targetName: target.name,
                previousMask: this.previousTargetMask,
                newMask: updatedTarget.statusMask
            }
        );
    }

    undo(state: GameState): CommandResult {
        if (this.previousTargetMask === undefined) {
            return this.failureResult(state, 'Cannot undo: no previous state');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Actor or target not found for undo');
        }

        // Restore previous mask
        const restoredTarget = target.update({ statusMask: this.previousTargetMask });

        // Clear lastProtectedTargetId
        const restoredActor = actor.withMetadata({ lastProtectedTargetId: undefined });

        // Update state
        let newState = state.updatePlayer(target.id, () => restoredTarget);
        newState = newState.updatePlayer(actor.id, () => restoredActor);

        return this.successResult(
            newState,
            `Undid guard protection on ${target.name}`,
            {
                targetId: target.id,
                restoredMask: this.previousTargetMask
            }
        );
    }
}
