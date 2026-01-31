/**
 * WerewolfKillCommand - Command for werewolf kill action
 * 
 * Marks target player with BITTEN status using bitwise OR operation.
 * Actual death is determined during night resolution based on protection/heal status.
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { PlayerStatus } from '../../entities/PlayerStatus';

export class WerewolfKillCommand extends BaseCommand {
    private previousTargetMask?: number;

    constructor(actorId: string, targetId: string) {
        super(actorId, 'soi', [targetId]);
    }

    get description(): string {
        const actor = this.actorId;
        const target = this.targetIds[0];
        return `Werewolf ${actor} attacks ${target}`;
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

        // Werewolves cannot target other werewolves
        const target = this.getTarget(state);
        if (target && target.team === 'werewolf') {
            return false;
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            return this.failureResult(state, 'Cannot execute werewolf kill');
        }

        const target = this.getTarget(state);
        if (!target) {
            return this.failureResult(state, 'Target not found');
        }

        // Store previous mask for undo
        this.previousTargetMask = target.statusMask;

        // Add BITTEN status using bitwise OR
        const updatedTarget = target.addStatus(PlayerStatus.BITTEN);

        // Update state
        const newState = state.updatePlayer(target.id, () => updatedTarget);

        return this.successResult(
            newState,
            `Werewolf marked ${target.name} as bitten`,
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

        const target = this.getTarget(state);
        if (!target) {
            return this.failureResult(state, 'Target not found for undo');
        }

        // Restore previous mask
        const restoredTarget = target.update({ statusMask: this.previousTargetMask });
        const newState = state.updatePlayer(target.id, () => restoredTarget);

        return this.successResult(
            newState,
            `Undid werewolf attack on ${target.name}`,
            {
                targetId: target.id,
                restoredMask: this.previousTargetMask
            }
        );
    }
}
