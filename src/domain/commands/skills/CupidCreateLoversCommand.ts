/**
 * CupidCreateLoversCommand - Command for Cupid to create lovers
 * 
 * Links two players as lovers on the first night.
 * If they are from different teams, they become neutral and can only win together.
 * If they are from the same team, they win with their team.
 * This is a one-time use ability (first night only).
 */

import { BaseCommand } from '../BaseCommand';
import { GameState } from '../../entities/GameState';
import { CommandResult } from '../CommandResult';
import { PlayerStatus } from '../../entities/PlayerStatus';
import { Team } from '../../../../assets/role-types';

export class CupidCreateLoversCommand extends BaseCommand {
    private previousTarget1Mask?: number;
    private previousTarget2Mask?: number;
    private previousTarget1Team?: Team;
    private previousTarget2Team?: Team;
    private previousTarget1Metadata?: Record<string, any>;
    private previousTarget2Metadata?: Record<string, any>;
    private previousGameMetadata?: Record<string, any>;

    constructor(actorId: string, target1Id: string, target2Id: string) {
        super(actorId, 'than_tinh_yeu', [target1Id, target2Id]);
    }

    get description(): string {
        const target1 = this.targetIds[0];
        const target2 = this.targetIds[1];
        return `Cupid creates lovers between ${target1} and ${target2}`;
    }

    canExecute(state: GameState): boolean {
        // Validate actor
        const actorValidation = this.validateActor(state);
        if (!actorValidation.valid) {
            return false;
        }

        // Validate targets exist and are alive
        const targetValidation = this.validateTargets(state, true);
        if (!targetValidation.valid) {
            return false;
        }

        // Validate exactly two targets
        const countValidation = this.validateTargetCount(2);
        if (!countValidation.valid) {
            return false;
        }

        // Check that both targets are different
        if (this.targetIds[0] === this.targetIds[1]) {
            return false;
        }

        // Cupid cannot select themselves as a target
        if (this.targetIds.includes(this.actorId)) {
            return false;
        }

        // Check if it's the first night
        if (state.nightNumber !== 1) {
            return false;
        }

        // Check if lovers already exist in this game
        if (state.metadata.loversCreated) {
            return false;
        }

        return true;
    }

    execute(state: GameState): CommandResult {
        // Validate execution
        if (!this.canExecute(state)) {
            if (state.nightNumber !== 1) {
                return this.failureResult(state, 'Thần Tình Yêu chỉ có thể tạo cặp đôi vào đêm đầu tiên');
            }
            if (state.metadata.loversCreated) {
                return this.failureResult(state, 'Cặp đôi đã được tạo trước đó');
            }
            if (this.targetIds[0] === this.targetIds[1]) {
                return this.failureResult(state, 'Phải chọn 2 người khác nhau');
            }
            if (this.targetIds.includes(this.actorId)) {
                return this.failureResult(state, 'Thần Tình Yêu không thể chọn chính mình');
            }
            return this.failureResult(state, 'Không thể tạo cặp đôi');
        }

        const target1 = state.getPlayer(this.targetIds[0]);
        const target2 = state.getPlayer(this.targetIds[1]);

        if (!target1 || !target2) {
            return this.failureResult(state, 'Không tìm thấy người chơi');
        }

        // Store previous states for undo
        this.previousTarget1Mask = target1.statusMask;
        this.previousTarget2Mask = target2.statusMask;
        this.previousTarget1Team = target1.team;
        this.previousTarget2Team = target2.team;
        this.previousTarget1Metadata = { ...target1.metadata };
        this.previousTarget2Metadata = { ...target2.metadata };
        this.previousGameMetadata = { ...state.metadata };

        // Determine if they are from the same team
        const sameTeam = target1.team === target2.team;

        // Add IS_LOVER status and set partner IDs
        let updatedTarget1 = target1
            .addStatus(PlayerStatus.IS_LOVER)
            .withMetadata({ 
                loverPartnerId: target2.id,
                originalTeam: target1.team
            });

        let updatedTarget2 = target2
            .addStatus(PlayerStatus.IS_LOVER)
            .withMetadata({ 
                loverPartnerId: target1.id,
                originalTeam: target2.team
            });

        // If different teams, both become neutral (for win condition purposes)
        if (!sameTeam) {
            updatedTarget1 = updatedTarget1.update({ team: 'neutral' as Team });
            updatedTarget2 = updatedTarget2.update({ team: 'neutral' as Team });
        }

        // Update state
        let newState = state.updatePlayer(target1.id, () => updatedTarget1);
        newState = newState.updatePlayer(target2.id, () => updatedTarget2);

        // Mark lovers as created in metadata
        newState = newState.withMetadata({
            loversCreated: true,
            lovers: {
                player1Id: target1.id,
                player2Id: target2.id,
                player1Name: target1.name,
                player2Name: target2.name,
                sameTeam: sameTeam,
                originalTeams: {
                    [target1.id]: this.previousTarget1Team,
                    [target2.id]: this.previousTarget2Team
                }
            }
        });

        const message = sameTeam
            ? `Thần Tình Yêu đã se duyên ${target1.name} và ${target2.name} (cùng phe)`
            : `Thần Tình Yêu đã se duyên ${target1.name} và ${target2.name} (khác phe - họ giờ là phe riêng!)`;

        return this.successResult(
            newState,
            message,
            {
                target1Id: target1.id,
                target2Id: target2.id,
                target1Name: target1.name,
                target2Name: target2.name,
                sameTeam,
                originalTeam1: this.previousTarget1Team,
                originalTeam2: this.previousTarget2Team
            }
        );
    }

    undo(state: GameState): CommandResult {
        if (
            this.previousTarget1Mask === undefined ||
            this.previousTarget2Mask === undefined ||
            this.previousTarget1Team === undefined ||
            this.previousTarget2Team === undefined
        ) {
            return this.failureResult(state, 'Không thể hoàn tác: không có trạng thái trước đó');
        }

        const target1 = state.getPlayer(this.targetIds[0]);
        const target2 = state.getPlayer(this.targetIds[1]);

        if (!target1 || !target2) {
            return this.failureResult(state, 'Không tìm thấy người chơi để hoàn tác');
        }

        // Restore previous states
        const restoredTarget1 = target1.update({
            statusMask: this.previousTarget1Mask,
            team: this.previousTarget1Team,
            metadata: this.previousTarget1Metadata || {}
        });

        const restoredTarget2 = target2.update({
            statusMask: this.previousTarget2Mask,
            team: this.previousTarget2Team,
            metadata: this.previousTarget2Metadata || {}
        });

        let newState = state.updatePlayer(target1.id, () => restoredTarget1);
        newState = newState.updatePlayer(target2.id, () => restoredTarget2);

        // Restore game metadata
        newState = newState.withMetadata(this.previousGameMetadata || {});

        return this.successResult(
            newState,
            `Đã hoàn tác tạo cặp đôi`,
            {
                target1Id: target1.id,
                target2Id: target2.id
            }
        );
    }
}
