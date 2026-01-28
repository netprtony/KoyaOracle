/**
 * ActionResolver - Resolves night actions with priority and conflict handling
 * Coordinates action execution and tracks restrictions
 */

import { SkillType, NightAction as NightActionType, Team } from '../../assets/role-types';
import { RoleManager, getRoleManager } from './RoleManager';
import { PlayerStateManager, EnhancedPlayerState } from './PlayerStateManager';

// Action priority (lower = earlier)
export const ACTION_PRIORITY: Record<SkillType, number> = {
    'createLovers': 1,
    'copyRole': 2,
    'markTargets': 3,
    'bless': 5,
    'protect': 10,
    'kill': 20,
    'heal': 21,
    'investigate': 30,
    'detectRole': 31,
    'silence': 40,
    'exile': 41,
    'recruit': 50,
    'swapRoles': 60,
    'gamble': 70,
    'dual': 15, // Phù Thủy acts after protection but involved in kill resolution
    'none': 100,
};

export interface GameAction {
    playerId: string;
    roleId: string;
    actionType: SkillType;
    targetIds: string[];
    timestamp: number;
    subAction?: string; // For dual actions: 'heal' or 'kill'
}

export interface ActionResult {
    success: boolean;
    actionType: SkillType;
    playerId: string;
    targetIds: string[];
    message: string;
    data?: any; // Investigation results, etc.
}

export interface NightResolutionResult {
    deaths: string[];
    savedPlayers: string[];
    transformedPlayers: string[];
    investigationResults: Map<string, any>;
    actionResults: ActionResult[];
}

export class ActionResolver {
    private roleManager: RoleManager;
    private stateManager: PlayerStateManager;
    private pendingActions: GameAction[];

    constructor(stateManager: PlayerStateManager, roleManager?: RoleManager) {
        this.stateManager = stateManager;
        this.roleManager = roleManager || getRoleManager();
        this.pendingActions = [];
    }

    /**
     * Check if a player can perform an action
     */
    canPerformAction(
        playerId: string,
        actionType: SkillType,
        targetIds: string[],
        nightNumber: number
    ): { canPerform: boolean; reason?: string } {
        const state = this.stateManager.getState(playerId);
        if (!state) {
            return { canPerform: false, reason: 'Player not found' };
        }

        if (!state.isAlive) {
            return { canPerform: false, reason: 'Player is dead' };
        }

        if (state.isExiled) {
            return { canPerform: false, reason: 'Player is exiled' };
        }

        const nightAction = this.roleManager.getNightAction(state.roleId);
        if (!nightAction) {
            return { canPerform: false, reason: 'Role has no night action' };
        }

        // Check frequency
        if (!this.roleManager.canPerformAction(
            state.roleId,
            nightNumber,
            state.usedAbilities.has(state.roleId)
        )) {
            return { canPerform: false, reason: 'Action not available this night' };
        }

        // Check conditional triggers
        if (nightAction.trigger) {
            const triggerCheck = this.checkTrigger(playerId, nightAction.trigger);
            if (!triggerCheck.passed) {
                return { canPerform: false, reason: triggerCheck.reason };
            }
        }

        // Check restrictions
        if (nightAction.restrictions) {
            for (const restriction of nightAction.restrictions) {
                const restrictionCheck = this.checkRestriction(
                    playerId,
                    restriction,
                    targetIds
                );
                if (!restrictionCheck.passed) {
                    return { canPerform: false, reason: restrictionCheck.reason };
                }
            }
        }

        // Check target validity
        for (const targetId of targetIds) {
            const targetState = this.stateManager.getState(targetId);
            if (!targetState) {
                return { canPerform: false, reason: `Target ${targetId} not found` };
            }

            // Most actions require alive targets
            if (!targetState.isAlive && actionType !== 'investigate') {
                return { canPerform: false, reason: 'Target is dead' };
            }
        }

        // Check canTargetSelf
        if (nightAction.canTargetSelf === false && targetIds.includes(playerId)) {
            return { canPerform: false, reason: 'Cannot target self' };
        }

        return { canPerform: true };
    }

    /**
     * Check action trigger conditions
     */
    private checkTrigger(
        playerId: string,
        trigger: string
    ): { passed: boolean; reason?: string } {
        switch (trigger) {
            case 'afterGrandmotherDeath':
                // Khăn Đỏ needs Bà Ngoại to be dead (killed by werewolves)
                const grandmothers = this.stateManager.getAllStates().filter(
                    s => s.roleId === 'ba_ngoai' && !s.isAlive && s.killedBy === 'werewolf'
                );
                if (grandmothers.length === 0) {
                    return { passed: false, reason: 'Grandmother not killed by werewolves yet' };
                }
                return { passed: true };

            case 'afterSeerDeath':
                // Tiên Tri Tập Sự needs main Tiên Tri to be dead
                const seers = this.stateManager.getAllStates().filter(
                    s => s.roleId === 'tien_tri' && !s.isAlive
                );
                if (seers.length === 0) {
                    return { passed: false, reason: 'Main Seer is still alive' };
                }
                return { passed: true };

            default:
                return { passed: true };
        }
    }

    /**
     * Check action restrictions
     */
    private checkRestriction(
        playerId: string,
        restriction: string,
        targetIds: string[]
    ): { passed: boolean; reason?: string } {
        const state = this.stateManager.getState(playerId);
        if (!state) return { passed: false, reason: 'Player not found' };

        switch (restriction) {
            case 'cannotTargetSamePersonConsecutively':
                // For Bảo Vệ and Pháp Sư
                if (state.lastProtectedId && targetIds.includes(state.lastProtectedId)) {
                    return { passed: false, reason: 'Cannot target same person consecutively' };
                }
                if (state.lastSilencedId && targetIds.includes(state.lastSilencedId)) {
                    return { passed: false, reason: 'Cannot target same person consecutively' };
                }
                return { passed: true };

            case 'cannotTargetWerewolves':
                // Werewolves cannot target other werewolves (except Sói Con)
                for (const targetId of targetIds) {
                    const targetState = this.stateManager.getState(targetId);
                    if (targetState?.team === 'werewolf') {
                        // Check if target is Sói Con (can be killed by pack)
                        if (targetState.roleId !== 'soi_con') {
                            return { passed: false, reason: 'Cannot target werewolves' };
                        }
                    }
                }
                return { passed: true };

            default:
                return { passed: true };
        }
    }

    /**
     * Submit an action for resolution
     */
    submitAction(action: GameAction): ActionResult {
        const canPerform = this.canPerformAction(
            action.playerId,
            action.actionType,
            action.targetIds,
            1 // Night number should be passed in
        );

        if (!canPerform.canPerform) {
            return {
                success: false,
                actionType: action.actionType,
                playerId: action.playerId,
                targetIds: action.targetIds,
                message: canPerform.reason || 'Cannot perform action',
            };
        }

        this.pendingActions.push(action);
        return {
            success: true,
            actionType: action.actionType,
            playerId: action.playerId,
            targetIds: action.targetIds,
            message: 'Action queued',
        };
    }

    /**
     * Resolve all pending night actions
     */
    resolveNightPhase(): NightResolutionResult {
        const result: NightResolutionResult = {
            deaths: [],
            savedPlayers: [],
            transformedPlayers: [],
            investigationResults: new Map(),
            actionResults: [],
        };

        // Sort actions by priority
        const sortedActions = [...this.pendingActions].sort(
            (a, b) => (ACTION_PRIORITY[a.actionType] || 100) - (ACTION_PRIORITY[b.actionType] || 100)
        );

        // Phase 1: Protection and blessing actions
        this.resolveProtectionActions(sortedActions, result);

        // Phase 2: Kill actions
        this.resolveKillActions(sortedActions, result);

        // Phase 3: Heal actions (save from kill)
        this.resolveHealActions(sortedActions, result);

        // Phase 4: Information actions
        this.resolveInformationActions(sortedActions, result);

        // Phase 5: Status effect actions
        this.resolveStatusActions(sortedActions, result);

        // Phase 6: Recruit actions
        this.resolveRecruitActions(sortedActions, result);

        // Phase 7: Other actions
        this.resolveOtherActions(sortedActions, result);

        // Phase 8: Process deaths
        this.processDeaths(result);

        // Clear pending actions
        this.pendingActions = [];

        return result;
    }

    /**
     * Resolve protection actions
     */
    private resolveProtectionActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'protect') {
                for (const targetId of action.targetIds) {
                    this.stateManager.setProtected(targetId, true);
                    this.stateManager.setLastProtected(action.playerId, targetId);
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'protect',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Protection applied',
                });
            }

            if (action.actionType === 'bless') {
                for (const targetId of action.targetIds) {
                    this.stateManager.setBlessed(targetId, true);
                }
                this.stateManager.useAbility(action.playerId, 'bless');
                result.actionResults.push({
                    success: true,
                    actionType: 'bless',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Blessing applied permanently',
                });
            }
        }
    }

    /**
     * Resolve kill actions
     */
    private resolveKillActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'kill' ||
                (action.actionType === 'dual' && action.subAction === 'kill')) {
                for (const targetId of action.targetIds) {
                    const targetState = this.stateManager.getState(targetId);
                    if (!targetState) continue;

                    // Check protection
                    if (targetState.isProtected || targetState.isBlessed) {
                        result.savedPlayers.push(targetId);
                        result.actionResults.push({
                            success: false,
                            actionType: 'kill',
                            playerId: action.playerId,
                            targetIds: [targetId],
                            message: 'Target was protected',
                        });
                        continue;
                    }

                    // Mark for death
                    this.stateManager.markForDeath(
                        targetId,
                        action.roleId,
                        this.getDeathDelay(targetState)
                    );

                    result.actionResults.push({
                        success: true,
                        actionType: 'kill',
                        playerId: action.playerId,
                        targetIds: [targetId],
                        message: 'Target marked for death',
                    });
                }
            }
        }
    }

    /**
     * Get death delay based on target role
     */
    private getDeathDelay(targetState: EnhancedPlayerState): number {
        // Thanh Niên Cứng survives one extra night if killed by werewolves
        if (targetState.roleId === 'thanh_nien_cung') {
            return 1;
        }
        return 0;
    }

    /**
     * Resolve heal actions
     */
    private resolveHealActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'heal' ||
                (action.actionType === 'dual' && action.subAction === 'heal')) {
                for (const targetId of action.targetIds) {
                    const targetState = this.stateManager.getState(targetId);
                    if (targetState?.markedForDeath) {
                        this.stateManager.saveFromDeath(targetId);
                        result.savedPlayers.push(targetId);
                        this.stateManager.useAbility(action.playerId, 'heal');
                        result.actionResults.push({
                            success: true,
                            actionType: 'heal',
                            playerId: action.playerId,
                            targetIds: [targetId],
                            message: 'Target saved from death',
                        });
                    }
                }
            }
        }
    }

    /**
     * Resolve information-gathering actions
     */
    private resolveInformationActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'investigate') {
                for (const targetId of action.targetIds) {
                    const info = this.getInvestigationResult(action.playerId, targetId);
                    result.investigationResults.set(`${action.playerId}:${targetId}`, info);
                    result.actionResults.push({
                        success: true,
                        actionType: 'investigate',
                        playerId: action.playerId,
                        targetIds: [targetId],
                        message: 'Investigation complete',
                        data: info,
                    });
                }
            }

            if (action.actionType === 'detectRole') {
                for (const targetId of action.targetIds) {
                    const nightAction = this.roleManager.getNightAction(
                        this.stateManager.getState(action.playerId)?.roleId || ''
                    );
                    const detected = this.detectRole(targetId, nightAction?.detectTarget);
                    result.investigationResults.set(`${action.playerId}:${targetId}`, detected);
                    result.actionResults.push({
                        success: true,
                        actionType: 'detectRole',
                        playerId: action.playerId,
                        targetIds: [targetId],
                        message: detected ? 'Target matches' : 'Target does not match',
                        data: detected,
                    });
                }
            }
        }
    }

    /**
     * Get investigation result based on role's information type
     */
    private getInvestigationResult(investigatorId: string, targetId: string): any {
        const investigatorState = this.stateManager.getState(investigatorId);
        const targetState = this.stateManager.getState(targetId);

        if (!investigatorState || !targetState) return null;

        const nightAction = this.roleManager.getNightAction(investigatorState.roleId);
        const information = nightAction?.information;

        switch (information) {
            case 'team':
                // Return what the target appears as (may be different from actual team)
                return this.roleManager.getAppearsAs(targetState.roleId);

            case 'exactRole':
                return targetState.roleId;

            case 'hasSpecialRole':
                // Check if target has any special abilities
                return this.roleManager.hasNightAction(targetState.roleId) ||
                    this.roleManager.hasPassiveSkill(targetState.roleId);

            case 'sameTeam':
                // For Nhà Ngoại Cảm - needs 2 targets
                // This is handled specially
                return targetState.team;

            case 'targetOrAdjacentIsWerewolf':
                // For Thám Tử
                const adjacent = this.stateManager.getAdjacentPlayers(targetId);
                const allToCheck = [targetId, ...adjacent];
                return allToCheck.some(id => {
                    const state = this.stateManager.getState(id);
                    return state?.team === 'werewolf';
                });

            default:
                return targetState.team;
        }
    }

    /**
     * Detect specific role
     */
    private detectRole(targetId: string, detectTarget?: string): boolean {
        const targetState = this.stateManager.getState(targetId);
        if (!targetState) return false;

        switch (detectTarget) {
            case 'seer':
                return ['tien_tri', 'tien_tri_tap_su', 'tien_tri_hao_quang', 'tien_tri_bi_an']
                    .includes(targetState.roleId);
            case 'werewolf':
                return targetState.team === 'werewolf';
            default:
                return false;
        }
    }

    /**
     * Resolve status effect actions
     */
    private resolveStatusActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'silence') {
                for (const targetId of action.targetIds) {
                    this.stateManager.setSilenced(targetId, true);
                    this.stateManager.setLastSilenced(action.playerId, targetId);
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'silence',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Target silenced for next day',
                });
            }

            if (action.actionType === 'exile') {
                for (const targetId of action.targetIds) {
                    this.stateManager.setExiled(targetId, true);
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'exile',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Target exiled for next day',
                });
            }
        }
    }

    /**
     * Resolve recruit actions
     */
    private resolveRecruitActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'recruit') {
                const actorState = this.stateManager.getState(action.playerId);
                for (const targetId of action.targetIds) {
                    if (actorState?.roleId === 'chu_giao_phai') {
                        // Cult leader recruits to cult
                        this.stateManager.addToCult(targetId);
                    } else if (actorState?.roleId === 'soi_trum') {
                        // Wolf boss converts to ally
                        // This is a one-time ability
                        this.stateManager.useAbility(action.playerId, 'recruit');
                    }
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'recruit',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Target recruited',
                });
            }
        }
    }

    /**
     * Resolve other actions
     */
    private resolveOtherActions(
        actions: GameAction[],
        result: NightResolutionResult
    ): void {
        for (const action of actions) {
            if (action.actionType === 'createLovers') {
                if (action.targetIds.length === 2) {
                    this.stateManager.createLovers(action.targetIds[0], action.targetIds[1]);
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'createLovers',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Lovers created',
                });
            }

            if (action.actionType === 'markTargets') {
                this.stateManager.setMarkedTargets(action.playerId, action.targetIds);
                result.actionResults.push({
                    success: true,
                    actionType: 'markTargets',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Targets marked',
                });
            }

            if (action.actionType === 'copyRole') {
                if (action.targetIds.length === 1) {
                    this.stateManager.setCopyTarget(action.playerId, action.targetIds[0]);
                }
                result.actionResults.push({
                    success: true,
                    actionType: 'copyRole',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Copy target set',
                });
            }

            if (action.actionType === 'swapRoles') {
                if (action.targetIds.length === 2) {
                    this.stateManager.swapRoles(action.targetIds[0], action.targetIds[1]);
                }
                this.stateManager.useAbility(action.playerId, 'swapRoles');
                result.actionResults.push({
                    success: true,
                    actionType: 'swapRoles',
                    playerId: action.playerId,
                    targetIds: action.targetIds,
                    message: 'Roles swapped',
                });
            }

            if (action.actionType === 'gamble') {
                for (const targetId of action.targetIds) {
                    const targetState = this.stateManager.getState(targetId);
                    if (targetState?.team === 'werewolf') {
                        // Gambler dies if target is werewolf
                        this.stateManager.markForDeath(action.playerId, 'gamble', 0);
                        result.actionResults.push({
                            success: false,
                            actionType: 'gamble',
                            playerId: action.playerId,
                            targetIds: [targetId],
                            message: 'Gambler targeted a werewolf and dies',
                        });
                    } else {
                        // Target dies if not werewolf
                        this.stateManager.markForDeath(targetId, 'gamble', 0);
                        result.actionResults.push({
                            success: true,
                            actionType: 'gamble',
                            playerId: action.playerId,
                            targetIds: [targetId],
                            message: 'Target killed',
                        });
                    }
                }
            }
        }
    }

    /**
     * Process deaths after all actions
     */
    private processDeaths(result: NightResolutionResult): void {
        const states = this.stateManager.getAllStates();

        for (const state of states) {
            if (state.markedForDeath && state.deathDelay === 0) {
                this.stateManager.killPlayer(state.playerId);
                result.deaths.push(state.playerId);
            }
        }
    }

    /**
     * Clear pending actions
     */
    clearPendingActions(): void {
        this.pendingActions = [];
    }
}
