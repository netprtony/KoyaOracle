/**
 * PassiveSkillHandler - Handles passive skill triggers
 * Manages on-death effects, attack reactions, and linked fates
 */

import { PassiveSkillType, Team } from '../../assets/role-types';
import { PlayerStateManager, EnhancedPlayerState } from './PlayerStateManager';
import { RoleManager, getRoleManager } from './RoleManager';

export interface PassiveEffect {
    type: string;
    sourcePlayerId: string;
    targetPlayerIds?: string[];
    message: string;
    data?: any;
}

export interface DeathProcessingResult {
    additionalDeaths: string[];
    effects: PassiveEffect[];
    hunterShotPending: boolean;
    hunterPlayerId?: string;
}

export class PassiveSkillHandler {
    private stateManager: PlayerStateManager;
    private roleManager: RoleManager;

    constructor(stateManager: PlayerStateManager, roleManager?: RoleManager) {
        this.stateManager = stateManager;
        this.roleManager = roleManager || getRoleManager();
    }

    /**
     * Process death of a player and trigger passive effects
     */
    processPlayerDeath(
        playerId: string,
        causeOfDeath: string
    ): DeathProcessingResult {
        const result: DeathProcessingResult = {
            additionalDeaths: [],
            effects: [],
            hunterShotPending: false,
        };

        const state = this.stateManager.getState(playerId);
        if (!state) return result;

        const role = this.roleManager.getRoleById(state.roleId);
        const passive = role?.skills?.passive;
        const onDeath = role?.skills?.onDeath;

        // Process role-specific on-death passives
        if (passive?.trigger === 'onDeath') {
            this.handleOnDeathPassive(state, passive.type as PassiveSkillType, result);
        }

        // Process onDeath skill (Thị Trưởng succession)
        if (onDeath) {
            this.handleOnDeathSkill(state, onDeath.type, result);
        }

        // Process linked fate deaths (lovers, twins)
        this.handleLinkedFateDeaths(state, result);

        // Check special death causes
        this.handleSpecialDeathCauses(state, causeOfDeath, result);

        return result;
    }

    /**
     * Handle passive skills triggered on death
     */
    private handleOnDeathPassive(
        state: EnhancedPlayerState,
        passiveType: PassiveSkillType,
        result: DeathProcessingResult
    ): void {
        switch (passiveType) {
            case 'revengeKill':
                // Thợ Săn - can shoot one person
                result.hunterShotPending = true;
                result.hunterPlayerId = state.playerId;
                result.effects.push({
                    type: 'hunterShot',
                    sourcePlayerId: state.playerId,
                    message: 'Thợ Săn có thể bắn một người trước khi chết',
                });
                break;

            case 'explosionOnDeath':
                // Khủng Bố - kill adjacent players
                const adjacent = this.stateManager.getAdjacentPlayers(state.playerId);
                for (const adjId of adjacent) {
                    this.stateManager.killPlayer(adjId);
                    result.additionalDeaths.push(adjId);
                }
                result.effects.push({
                    type: 'explosion',
                    sourcePlayerId: state.playerId,
                    targetPlayerIds: adjacent,
                    message: `Khủng Bố nổ tung, giết ${adjacent.length} người bên cạnh`,
                });
                break;

            case 'revenge':
                // Sói Con - werewolves kill 2 next night
                this.stateManager.setWerewolfKillBonus(1); // +1 extra kill
                result.effects.push({
                    type: 'werewolfRevenge',
                    sourcePlayerId: state.playerId,
                    message: 'Bầy sói được giết 2 người đêm sau để trả thù',
                });
                break;

            case 'enablePower':
                // Bà Ngoại - check if killed by werewolf
                const passive = this.roleManager.getPassiveSkill(state.roleId);
                if (passive?.beneficiary && state.killedBy === 'werewolf') {
                    // Enable Khăn Đỏ's power
                    const beneficiary = passive.beneficiary;
                    result.effects.push({
                        type: 'powerEnabled',
                        sourcePlayerId: state.playerId,
                        message: `Khăn Đỏ mở khóa sức mạnh vì Bà Ngoại bị Sói ăn`,
                        data: { beneficiary },
                    });
                }
                break;
        }
    }

    /**
     * Handle onDeath skills (like succession)
     */
    private handleOnDeathSkill(
        state: EnhancedPlayerState,
        skillType: string,
        result: DeathProcessingResult
    ): void {
        switch (skillType) {
            case 'succession':
                // Thị Trưởng can choose successor
                result.effects.push({
                    type: 'succession',
                    sourcePlayerId: state.playerId,
                    message: 'Thị Trưởng có thể chọn người kế nhiệm',
                });
                break;
        }
    }

    /**
     * Handle linked fate deaths (lovers, twins)
     */
    private handleLinkedFateDeaths(
        state: EnhancedPlayerState,
        result: DeathProcessingResult
    ): void {
        // Lovers
        if (state.isLovers && state.loverPartnerId) {
            const partner = this.stateManager.getState(state.loverPartnerId);
            if (partner?.isAlive) {
                this.stateManager.killPlayer(partner.playerId);
                result.additionalDeaths.push(partner.playerId);
                result.effects.push({
                    type: 'linkedFate',
                    sourcePlayerId: state.playerId,
                    targetPlayerIds: [partner.playerId],
                    message: 'Người yêu chết theo vì quá đau buồn',
                });
            }
        }

        // Twins
        if (state.isTwin && state.twinPartnerId) {
            const partner = this.stateManager.getState(state.twinPartnerId);
            if (partner?.isAlive) {
                this.stateManager.killPlayer(partner.playerId);
                result.additionalDeaths.push(partner.playerId);
                result.effects.push({
                    type: 'linkedFate',
                    sourcePlayerId: state.playerId,
                    targetPlayerIds: [partner.playerId],
                    message: 'Song sinh chết theo vì liên kết tâm linh',
                });
            }
        }
    }

    /**
     * Handle special death causes
     */
    private handleSpecialDeathCauses(
        state: EnhancedPlayerState,
        causeOfDeath: string,
        result: DeathProcessingResult
    ): void {
        // Nhân Bản triggers when copy target dies
        const allPlayers = this.stateManager.getAllStates();
        for (const player of allPlayers) {
            if (player.copyTargetId === state.playerId && player.isAlive) {
                // Nhân Bản now copies the dead player's role
                const deadPlayerRole = state.roleId;
                const deadPlayerTeam = state.team;

                // Don't actually copy - just record the effect
                // The actual role change should be handled elsewhere
                result.effects.push({
                    type: 'copyRoleTriggered',
                    sourcePlayerId: player.playerId,
                    targetPlayerIds: [state.playerId],
                    message: `Nhân Bản sao chép vai trò của ${state.playerId}`,
                    data: { copiedRole: deadPlayerRole, copiedTeam: deadPlayerTeam },
                });
            }
        }
    }

    /**
     * Process attack on a player and check for passive reactions
     */
    processAttack(
        targetId: string,
        attackerTeam: Team,
        attackerRoleId: string
    ): { shouldDie: boolean; effects: PassiveEffect[] } {
        const effects: PassiveEffect[] = [];
        const state = this.stateManager.getState(targetId);
        if (!state) return { shouldDie: true, effects };

        const role = this.roleManager.getRoleById(state.roleId);
        const passive = role?.skills?.passive;

        // Check protection first
        if (state.isProtected || state.isBlessed) {
            return { shouldDie: false, effects };
        }

        // Check passive reactions
        if (passive?.trigger === 'onWerewolfAttack' && attackerTeam === 'werewolf') {
            return this.handleWerewolfAttackReaction(state, passive.type as PassiveSkillType, effects);
        }

        return { shouldDie: true, effects };
    }

    /**
     * Handle reactions to werewolf attacks
     */
    private handleWerewolfAttackReaction(
        state: EnhancedPlayerState,
        passiveType: PassiveSkillType,
        effects: PassiveEffect[]
    ): { shouldDie: boolean; effects: PassiveEffect[] } {
        switch (passiveType) {
            case 'transformation':
                // Bị Nguyền - transforms instead of dying
                this.stateManager.transformPlayer(state.playerId, 'soi', 'werewolf');
                effects.push({
                    type: 'transformation',
                    sourcePlayerId: state.playerId,
                    message: 'Bị Nguyền hóa thành Sói thay vì chết',
                });
                return { shouldDie: false, effects };

            case 'delayedDeath':
                // Thanh Niên Cứng - dies next night instead
                this.stateManager.markForDeath(state.playerId, 'werewolf', 1);
                effects.push({
                    type: 'delayedDeath',
                    sourcePlayerId: state.playerId,
                    message: 'Thanh Niên Cứng sẽ chết vào đêm sau',
                });
                return { shouldDie: false, effects };

            case 'diseaseCarrier':
                // Người Bệnh - infects werewolves
                this.stateManager.infectWerewolves();
                effects.push({
                    type: 'infection',
                    sourcePlayerId: state.playerId,
                    message: 'Bầy sói bị nhiễm bệnh, không thể cắn đêm sau',
                });
                return { shouldDie: true, effects };

            default:
                return { shouldDie: true, effects };
        }
    }

    /**
     * Handle execution (for Hoàng Tử)
     */
    processExecution(targetId: string): { shouldDie: boolean; effects: PassiveEffect[] } {
        const effects: PassiveEffect[] = [];
        const state = this.stateManager.getState(targetId);
        if (!state) return { shouldDie: true, effects };

        const role = this.roleManager.getRoleById(state.roleId);
        const passive = role?.skills?.passive;

        // Hoàng Tử survives execution once
        if (passive?.type === 'surviveExecution') {
            const hasUsed = state.usedAbilities.has('surviveExecution');
            if (!hasUsed) {
                this.stateManager.useAbility(targetId, 'surviveExecution');
                effects.push({
                    type: 'surviveExecution',
                    sourcePlayerId: state.playerId,
                    message: 'Hoàng Tử tiết lộ thân phận và thoát chết',
                });
                return { shouldDie: false, effects };
            }
        }

        return { shouldDie: true, effects };
    }

    /**
     * Execute hunter's shot
     */
    executeHunterShot(hunterId: string, targetId: string): PassiveEffect[] {
        const effects: PassiveEffect[] = [];

        const targetState = this.stateManager.getState(targetId);
        if (!targetState || !targetState.isAlive) {
            effects.push({
                type: 'hunterShot',
                sourcePlayerId: hunterId,
                message: 'Thợ Săn bắn lên trời',
            });
            return effects;
        }

        this.stateManager.killPlayer(targetId);
        effects.push({
            type: 'hunterShot',
            sourcePlayerId: hunterId,
            targetPlayerIds: [targetId],
            message: `Thợ Săn bắn chết ${targetId}`,
        });

        // Process the target's death (may trigger more effects)
        const deathResult = this.processPlayerDeath(targetId, 'hunterShot');
        effects.push(...deathResult.effects);

        return effects;
    }

    /**
     * Process first night special events
     */
    processFirstNight(): PassiveEffect[] {
        const effects: PassiveEffect[] = [];

        // Hồn Ma dies automatically on first night
        const allPlayers = this.stateManager.getAllStates();
        for (const player of allPlayers) {
            if (player.roleId === 'hon_ma' && player.isAlive) {
                const passive = this.roleManager.getPassiveSkill('hon_ma');
                if (passive?.trigger === 'firstNight') {
                    this.stateManager.killPlayer(player.playerId);
                    effects.push({
                        type: 'autoKill',
                        sourcePlayerId: player.playerId,
                        message: 'Hồn Ma chết vào đêm đầu tiên để bắt đầu giao tiếp từ cõi âm',
                    });
                }
            }
        }

        return effects;
    }

    /**
     * Process night three events
     */
    processNightThree(): PassiveEffect[] {
        const effects: PassiveEffect[] = [];

        // Bợm Nhậu gets random role revealed
        const allPlayers = this.stateManager.getAllStates();
        for (const player of allPlayers) {
            if (player.roleId === 'bom_nhau' && player.isAlive && !player.hasTransformed) {
                const passive = this.roleManager.getPassiveSkill('bom_nhau');
                if (passive?.trigger === 'nightThree') {
                    // In actual game, this would be random role assignment
                    // For now, just record the effect
                    effects.push({
                        type: 'roleReveal',
                        sourcePlayerId: player.playerId,
                        message: 'Bợm Nhậu được tiết lộ vai trò thực sự',
                    });
                }
            }
        }

        return effects;
    }
}
