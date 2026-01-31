/**
 * GameEngine - Main coordinator for the Werewolf game
 * Orchestrates all managers and handles game flow
 */

import { Role, Team, SkillType } from '../../assets/role-types';
import { RoleManager, getRoleManager, resetRoleManager } from './RoleManager';
import { PlayerStateManager, PlayerInput, EnhancedPlayerState } from './PlayerStateManager';
import { ActionResolver, GameAction, NightResolutionResult } from './ActionResolver';
import { WinConditionChecker, WinResult } from './WinConditionChecker';
import { PassiveSkillHandler, DeathProcessingResult, PassiveEffect } from './PassiveSkillHandler';

// Domain Layer Imports
import { CommandInvoker } from '../domain/commands/CommandInvoker';
import { NightResolver } from '../domain/services/NightResolver';
import { GameState as DomainGameState } from '../domain/entities/GameState';
import { Player as DomainPlayer } from '../domain/entities/Player';
import { PlayerStatus } from '../domain/entities/PlayerStatus';
import { getCommandFactory } from '../domain/commands/skills/CommandFactory';

export interface GameConfig {
    players: PlayerInput[];
    scenario?: {
        id: string;
        nightOrder: string[];
    };
}

export interface NightPhaseResult {
    deaths: string[];
    savedPlayers: string[];
    transformedPlayers: string[];
    investigationResults: Map<string, any>;
    effects: PassiveEffect[];
    winResult?: WinResult;
}

export interface DayPhaseResult {
    executedPlayer?: string;
    hunterShotPending: boolean;
    hunterPlayerId?: string;
    additionalDeaths: string[];
    effects: PassiveEffect[];
    winResult?: WinResult;
}

export interface GameState {
    nightNumber: number;
    phase: 'night' | 'day' | 'gameOver';
    alivePlayers: EnhancedPlayerState[];
    deadPlayers: EnhancedPlayerState[];
    winner?: WinResult;
}

export class GameEngine {
    // Legacy managers (for backward compatibility)
    private roleManager: RoleManager;
    private stateManager: PlayerStateManager;
    private actionResolver: ActionResolver;
    private winChecker: WinConditionChecker;
    private passiveHandler: PassiveSkillHandler;

    // Domain layer (new architecture)
    private commandInvoker: CommandInvoker;
    private nightResolver: NightResolver;
    private domainState: DomainGameState;

    private nightNumber: number = 0;
    private phase: 'night' | 'day' | 'gameOver' = 'night';
    private pendingHunterShot: boolean = false;
    private hunterPlayerId?: string;

    constructor(config: GameConfig) {
        this.roleManager = getRoleManager();
        this.stateManager = new PlayerStateManager();

        // Initialize players
        this.stateManager.initializePlayers(config.players);

        // Initialize legacy managers
        this.actionResolver = new ActionResolver(this.stateManager, this.roleManager);
        this.winChecker = new WinConditionChecker(this.stateManager, this.roleManager);
        this.passiveHandler = new PassiveSkillHandler(this.stateManager, this.roleManager);

        // Initialize domain layer
        this.domainState = this.createInitialDomainState(config.players);
        this.commandInvoker = new CommandInvoker(this.domainState);
        const nightOrder = config.scenario?.nightOrder || [];
        this.nightResolver = new NightResolver(this.commandInvoker, nightOrder);
    }

    /**
     * Get current game state
     */
    getGameState(): GameState {
        const allPlayers = this.stateManager.getAllStates();
        return {
            nightNumber: this.nightNumber,
            phase: this.phase,
            alivePlayers: allPlayers.filter(p => p.isAlive),
            deadPlayers: allPlayers.filter(p => !p.isAlive),
            winner: this.phase === 'gameOver' ? this.winChecker.checkWinConditions() : undefined,
        };
    }

    /**
     * Get player state
     */
    getPlayerState(playerId: string): EnhancedPlayerState | undefined {
        return this.stateManager.getState(playerId);
    }

    /**
     * Get all alive players
     */
    getAlivePlayers(): EnhancedPlayerState[] {
        return this.stateManager.getAlivePlayers();
    }

    /**
     * Start a new night phase
     */
    startNightPhase(): { nightNumber: number; effects: PassiveEffect[] } {
        this.nightNumber++;
        this.phase = 'night';

        // Reset night-only statuses
        this.stateManager.resetNightStatuses();

        // Clear infection if werewolves were infected
        if (this.nightNumber > 1) {
            this.stateManager.clearWerewolfInfection();
        }

        const effects: PassiveEffect[] = [];

        // First night special processing
        if (this.nightNumber === 1) {
            const firstNightEffects = this.passiveHandler.processFirstNight();
            effects.push(...firstNightEffects);
        }

        // Night 3 special processing
        if (this.nightNumber === 3) {
            const nightThreeEffects = this.passiveHandler.processNightThree();
            effects.push(...nightThreeEffects);
        }

        // Process delayed deaths from previous night
        const delayedDeaths = this.stateManager.processDelayedDeaths();
        for (const playerId of delayedDeaths) {
            const deathResult = this.passiveHandler.processPlayerDeath(playerId, 'delayedDeath');
            effects.push(...deathResult.effects);
        }

        return { nightNumber: this.nightNumber, effects };
    }

    /**
     * Submit a night action
     */
    submitNightAction(action: GameAction): { success: boolean; message: string } {
        if (this.phase !== 'night') {
            return { success: false, message: 'Not in night phase' };
        }

        const result = this.actionResolver.submitAction(action);
        return { success: result.success, message: result.message };
    }

    /**
     * Check if player can perform an action
     */
    canPerformAction(
        playerId: string,
        actionType: SkillType,
        targetIds: string[]
    ): { canPerform: boolean; reason?: string } {
        return this.actionResolver.canPerformAction(
            playerId,
            actionType,
            targetIds,
            this.nightNumber
        );
    }

    /**
     * Resolve the current night phase
     */
    resolveNight(): NightPhaseResult {
        if (this.phase !== 'night') {
            return {
                deaths: [],
                savedPlayers: [],
                transformedPlayers: [],
                investigationResults: new Map(),
                effects: [],
            };
        }

        // Resolve all actions
        const actionResult = this.actionResolver.resolveNightPhase();

        const result: NightPhaseResult = {
            deaths: [...actionResult.deaths],
            savedPlayers: actionResult.savedPlayers,
            transformedPlayers: actionResult.transformedPlayers,
            investigationResults: actionResult.investigationResults,
            effects: [],
        };

        // Process deaths and trigger passives
        for (const playerId of actionResult.deaths) {
            const state = this.stateManager.getState(playerId);
            const deathResult = this.passiveHandler.processPlayerDeath(
                playerId,
                state?.killedBy || 'unknown'
            );

            result.effects.push(...deathResult.effects);
            result.deaths.push(...deathResult.additionalDeaths);

            if (deathResult.hunterShotPending) {
                this.pendingHunterShot = true;
                this.hunterPlayerId = deathResult.hunterPlayerId;
            }
        }

        // Check win conditions
        const winResult = this.winChecker.checkWinConditions();
        if (winResult.hasWinner) {
            this.phase = 'gameOver';
            result.winResult = winResult;
        }

        return result;
    }

    /**
     * Start day phase
     */
    startDayPhase(): void {
        this.phase = 'day';
        this.stateManager.resetDayStatuses();
    }

    /**
     * Execute a player (lynch)
     */
    executePlayer(playerId: string): DayPhaseResult {
        if (this.phase !== 'day') {
            return {
                hunterShotPending: false,
                additionalDeaths: [],
                effects: [],
            };
        }

        const result: DayPhaseResult = {
            hunterShotPending: false,
            additionalDeaths: [],
            effects: [],
        };

        // Check if player can survive execution (Hoàng Tử)
        const executionResult = this.passiveHandler.processExecution(playerId);

        if (!executionResult.shouldDie) {
            result.effects.push(...executionResult.effects);
            return result;
        }

        // Kill the player
        this.stateManager.killPlayer(playerId);

        // Mark cause of death for win conditions (Kẻ Chán Đời)
        const state = this.stateManager.getState(playerId);
        if (state) {
            state.killedBy = 'execution';
        }

        result.executedPlayer = playerId;

        // Process death effects
        const deathResult = this.passiveHandler.processPlayerDeath(playerId, 'execution');
        result.additionalDeaths = deathResult.additionalDeaths;
        result.effects.push(...deathResult.effects);

        if (deathResult.hunterShotPending) {
            result.hunterShotPending = true;
            result.hunterPlayerId = deathResult.hunterPlayerId;
        }

        // Check win conditions
        const winResult = this.winChecker.checkWinConditions();
        if (winResult.hasWinner) {
            this.phase = 'gameOver';
            result.winResult = winResult;
        }

        return result;
    }

    /**
     * Skip execution (no lynch)
     */
    skipExecution(): DayPhaseResult {
        return {
            hunterShotPending: false,
            additionalDeaths: [],
            effects: [],
        };
    }

    /**
     * Execute hunter's revenge shot
     */
    hunterShoot(targetId: string | null): PassiveEffect[] {
        if (!this.pendingHunterShot || !this.hunterPlayerId) {
            return [];
        }

        this.pendingHunterShot = false;

        if (!targetId) {
            // Hunter shoots at sky
            return [{
                type: 'hunterShot',
                sourcePlayerId: this.hunterPlayerId,
                message: 'Thợ Săn bắn lên trời',
            }];
        }

        const effects = this.passiveHandler.executeHunterShot(this.hunterPlayerId, targetId);
        this.hunterPlayerId = undefined;

        // Check win conditions after hunter shot
        const winResult = this.winChecker.checkWinConditions();
        if (winResult.hasWinner) {
            this.phase = 'gameOver';
        }

        return effects;
    }

    /**
     * Check current win conditions
     */
    checkWinConditions(): WinResult {
        return this.winChecker.checkWinConditions();
    }

    /**
     * Check if player has won
     */
    checkPlayerWin(playerId: string): WinResult {
        return this.winChecker.checkPlayerWin(playerId);
    }

    /**
     * Get role info
     */
    getRoleInfo(roleId: string): Role | undefined {
        return this.roleManager.getRoleById(roleId);
    }

    /**
     * Check if there's a pending hunter shot
     */
    hasPendingHunterShot(): boolean {
        return this.pendingHunterShot;
    }

    /**
     * Get current phase
     */
    getCurrentPhase(): 'night' | 'day' | 'gameOver' {
        return this.phase;
    }

    /**
     * Get current night number
     */
    getNightNumber(): number {
        return this.nightNumber;
    }

    /**
     * Create lovers (for Thần Tình Yêu action)
     */
    createLovers(player1Id: string, player2Id: string): void {
        this.stateManager.createLovers(player1Id, player2Id);
    }

    /**
     * Assign mayor (Thị Trưởng) vote weight
     */
    assignMayor(playerId: string): void {
        this.stateManager.setVoteWeight(playerId, 2);
    }

    /**
     * Transfer mayor role to successor
     */
    transferMayor(fromPlayerId: string, toPlayerId: string): void {
        this.stateManager.setVoteWeight(fromPlayerId, 1);
        this.stateManager.setVoteWeight(toPlayerId, 2);
    }

    // ============================================
    // Domain Layer Methods (New Architecture)
    // ============================================

    /**
     * Create initial domain state from player inputs
     */
    private createInitialDomainState(players: PlayerInput[]): DomainGameState {
        const domainPlayers = players.map((p, index) => {
            const role = this.roleManager.getRoleById(p.roleId || '');
            const team = role?.team || 'villager';

            return new DomainPlayer(
                p.id,
                p.name,
                p.roleId || 'unassigned',
                team,
                PlayerStatus.ALIVE,
                index
            );
        });

        return DomainGameState.fromPlayers(domainPlayers);
    }

    /**
     * Sync domain state to legacy PlayerStateManager
     * (for backward compatibility during migration)
     */
    private syncToLegacyState(domainState: DomainGameState): void {
        for (const domainPlayer of domainState.getAllPlayers()) {
            const legacyState = this.stateManager.getState(domainPlayer.id);

            if (legacyState) {
                // Update alive status
                if (!domainPlayer.isAlive && legacyState.isAlive) {
                    this.stateManager.killPlayer(domainPlayer.id);
                }

                // Sync protection status
                if (domainPlayer.isProtected !== legacyState.isProtected) {
                    this.stateManager.setProtected(domainPlayer.id, domainPlayer.isProtected);
                }

                // Sync blessed status
                if (domainPlayer.isBlessed !== legacyState.isBlessed) {
                    this.stateManager.setBlessed(domainPlayer.id, domainPlayer.isBlessed);
                }
            }
        }
    }

    /**
     * Undo last night action (NEW)
     */
    undoLastAction(): { success: boolean; message: string } {
        const result = this.commandInvoker.undo(this.domainState);

        if (result.isSuccess) {
            this.domainState = result.newState;
            this.syncToLegacyState(result.newState);
        }

        return {
            success: result.isSuccess,
            message: result.message || (result.isFailure ? 'Undo failed' : '')
        };
    }

    /**
     * Redo last undone action (NEW)
     */
    redoLastAction(): { success: boolean; message: string } {
        const result = this.commandInvoker.redo(this.domainState);

        if (result.isSuccess) {
            this.domainState = result.newState;
            this.syncToLegacyState(result.newState);
        }

        return {
            success: result.isSuccess,
            message: result.message || (result.isFailure ? 'Redo failed' : '')
        };
    }

    /**
     * Check if undo is available (NEW)
     */
    canUndo(): boolean {
        return this.commandInvoker.canUndo();
    }

    /**
     * Check if redo is available (NEW)
     */
    canRedo(): boolean {
        return this.commandInvoker.canRedo();
    }

    /**
     * Get command history (NEW)
     */
    getCommandHistory(): readonly any[] {
        return this.commandInvoker.getHistory();
    }
}

/**
 * Factory function specifically for testing
 */
export function createGameEngine(config: GameConfig): GameEngine {
    return new GameEngine(config);
}

/**
 * Reset singleton for testing
 */
export function resetGameEngine(): void {
    resetRoleManager();
}
