/**
 * SeerInvestigateCommand - Command for seer investigation action
 * 
 * Investigates target player's team affiliation.
 * Returns investigation result in command metadata.
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { Team } from '../../../../assets/role-types';

export class SeerInvestigateCommand extends BaseCommand {
    constructor(actorId: string, targetId: string) {
        super(actorId, 'tien_tri', [targetId]);
    }

    get description(): string {
        const actor = this.actorId;
        const target = this.targetIds[0];
        return `Seer ${actor} investigates ${target}`;
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

        // Cannot investigate self
        const selfValidation = this.validateNotSelf(false);
        if (!selfValidation.valid) {
            return false;
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            return this.failureResult(state, 'Cannot execute seer investigation');
        }

        const target = this.getTarget(state);
        if (!target) {
            return this.failureResult(state, 'Target not found');
        }

        // Get investigation result based on target's team
        // Special cases:
        // - Con Lai (con_lai) appears as werewolf but is villager
        // - Bà Đồng (ba_dong) appears as villager but helps werewolves
        // - Ma Cà Rồng (ma_ca_rong) appears as werewolf

        let investigationResult: Team | 'werewolf' = target.team;

        // Apply special role appearances
        if (target.roleId === 'con_lai') {
            investigationResult = 'werewolf'; // Appears as werewolf
        } else if (target.roleId === 'ba_dong') {
            investigationResult = 'villager'; // Appears as villager
        } else if (target.roleId === 'ma_ca_rong') {
            investigationResult = 'werewolf'; // Vampire appears as werewolf
        }

        // State doesn't change for investigation (read-only action)
        return this.successResult(
            state,
            `Seer investigated ${target.name}`,
            {
                targetId: target.id,
                targetName: target.name,
                targetRoleId: target.roleId,
                investigationResult,
                actualTeam: target.team
            }
        );
    }

    undo(state: GameState): CommandResult {
        // Investigation is read-only, no state change to undo
        return this.successResult(
            state,
            'Undid seer investigation (no state change)',
            {}
        );
    }
}
