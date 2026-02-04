/**
 * PastorBlessCommand - Command for pastor bless action
 * 
 * Marks target player with BLESSED status using bitwise OR operation.
 * Target becomes immortal for the current night.
 * This is a one-time use ability.
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { PlayerStatus } from '../../entities/PlayerStatus';

export class PastorBlessCommand extends BaseCommand {
    private previousTargetMask?: number;
    private previousActorMask?: number;

    constructor(actorId: string, targetId: string) {
        super(actorId, 'muc_su', [targetId]);
    }

    get description(): string {
        const actor = this.actorId;
        const target = this.targetIds[0];
        return `Pastor ${actor} blesses ${target}`;
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

        // Check if blessing was already used (one-time ability)
        const actor = this.getActor(state);
        if (actor && actor.hasStatus(PlayerStatus.USED_BLESS)) {
            return false;
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            const actor = this.getActor(state);
            if (actor?.hasStatus(PlayerStatus.USED_BLESS)) {
                return this.failureResult(state, 'Pastor đã sử dụng kỹ năng ban phước rồi');
            }
            return this.failureResult(state, 'Không thể thực hiện ban phước');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Không tìm thấy Pastor hoặc mục tiêu');
        }

        // Store previous masks for undo
        this.previousTargetMask = target.statusMask;
        this.previousActorMask = actor.statusMask;

        const isSelfBless = actor.id === target.id;
        let newState: GameState;

        if (isSelfBless) {
            // Self-bless: add both BLESSED and USED_BLESS to the same player
            const updatedActor = actor
                .addStatus(PlayerStatus.BLESSED)
                .addStatus(PlayerStatus.USED_BLESS);
            newState = state.updatePlayer(actor.id, () => updatedActor);
        } else {
            // Bless another player: update target and actor separately
            const updatedTarget = target.addStatus(PlayerStatus.BLESSED);
            const updatedActor = actor.addStatus(PlayerStatus.USED_BLESS);
            
            newState = state.updatePlayer(target.id, () => updatedTarget);
            newState = newState.updatePlayer(actor.id, () => updatedActor);
        }

        const message = isSelfBless
            ? `Mục Sư đã tự ban phước cho chính mình`
            : `Mục Sư đã ban phước cho ${target.name}`;

        // Get updated player for metadata
        const finalTarget = newState.getPlayer(target.id);
        const finalActor = newState.getPlayer(actor.id);

        return this.successResult(
            newState,
            message,
            {
                targetId: target.id,
                targetName: target.name,
                isSelfBless,
                previousTargetMask: this.previousTargetMask,
                previousActorMask: this.previousActorMask,
                newTargetMask: finalTarget?.statusMask,
                newActorMask: finalActor?.statusMask
            }
        );
    }

    undo(state: GameState): CommandResult {
        if (this.previousTargetMask === undefined || this.previousActorMask === undefined) {
            return this.failureResult(state, 'Không thể hoàn tác: không có trạng thái trước đó');
        }

        const actor = this.getActor(state);
        const target = this.getTarget(state);

        if (!actor || !target) {
            return this.failureResult(state, 'Không tìm thấy Pastor hoặc mục tiêu để hoàn tác');
        }

        // Restore previous masks
        const restoredTarget = target.update({ statusMask: this.previousTargetMask });
        const restoredActor = actor.update({ statusMask: this.previousActorMask });

        let newState = state.updatePlayer(target.id, () => restoredTarget);
        newState = newState.updatePlayer(actor.id, () => restoredActor);

        return this.successResult(
            newState,
            `Đã hoàn tác ban phước cho ${target.name}`,
            {
                targetId: target.id,
                restoredTargetMask: this.previousTargetMask,
                restoredActorMask: this.previousActorMask
            }
        );
    }
}
