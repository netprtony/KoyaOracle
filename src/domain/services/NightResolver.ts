/**
 * @module NightResolver
 * @description Service for resolving night phase actions using command pattern and bitmask logic.
 * 
 * Executes commands in thu_tu_goi order from KichBan.json and calculates deaths
 * using bitmask operations. Handles cascade effects like lovers and twins.
 * Central to the domain layer's night phase processing.
 *
 * @see GameState
 * @see PlayerStatus
 * @see CommandInvoker
 * @see ActionResolver
 */

import { GameState } from '../entities/GameState';
import { Player } from '../entities/Player';
import { PlayerStatus, clearNightStatuses } from '../entities/PlayerStatus';
import { ICommand } from '../commands/ICommand';
import { CommandInvoker } from '../commands/CommandInvoker';
import { CommandResult } from '../commands/CommandResult';

export interface NightResolutionResult {
    state: GameState;
    deaths: string[];
    savedPlayers: string[];
    investigationResults: Map<string, any>;
    effects: NightEffect[];
    messages: string[];
}

export interface NightEffect {
    type: string;
    playerId: string;
    description: string;
    metadata?: Record<string, any>;
}

export class NightResolver {
    constructor(
        private commandInvoker: CommandInvoker,
        private nightOrder: string[] = []
    ) { }

    /**
     * Set night order from KichBan.json thu_tu_goi
     */
    setNightOrder(order: string[]): void {
        this.nightOrder = order;
    }

    /**
     * Resolve night phase
     * 
     * 1. Execute commands in thu_tu_goi order
     * 2. Calculate deaths using bitmask logic
     * 3. Apply death effects (lovers, twins, etc.)
     * 4. Clear temporary night statuses
     * 
     * @param state - Current game state
     * @param commands - Commands to execute
     * @returns Resolution result with updated state and effects
     */
    resolve(state: GameState, commands: ICommand[]): NightResolutionResult {
        let currentState = state;
        const deaths: string[] = [];
        const savedPlayers: string[] = [];
        const investigationResults = new Map<string, any>();
        const effects: NightEffect[] = [];
        const messages: string[] = [];

        // 1. Execute commands in thu_tu_goi order
        const executionResult = this.executeCommandsInOrder(currentState, commands);
        currentState = executionResult.state;
        effects.push(...executionResult.effects);
        investigationResults.set('investigations', executionResult.investigations);

        // 2. Calculate deaths using bitmask
        const deathResult = this.calculateDeaths(currentState);
        deaths.push(...deathResult.deaths);
        savedPlayers.push(...deathResult.saved);
        currentState = deathResult.state;
        effects.push(...deathResult.effects);

        // 3. Apply cascade death effects (lovers, twins)
        const cascadeResult = this.applyCascadeDeaths(currentState, deaths);
        deaths.push(...cascadeResult.additionalDeaths);
        currentState = cascadeResult.state;
        effects.push(...cascadeResult.effects);

        // 4. Clear temporary night statuses
        currentState = this.clearTemporaryStatuses(currentState);

        // 5. Generate messages
        messages.push(...this.generateMessages(deaths, savedPlayers, effects));

        return {
            state: currentState,
            deaths,
            savedPlayers,
            investigationResults,
            effects,
            messages
        };
    }

    /**
     * Execute commands in thu_tu_goi order
     */
    private executeCommandsInOrder(
        state: GameState,
        commands: ICommand[]
    ): {
        state: GameState;
        effects: NightEffect[];
        investigations: any[];
    } {
        let currentState = state;
        const effects: NightEffect[] = [];
        const investigations: any[] = [];

        // Group commands by role ID
        const commandsByRole = new Map<string, ICommand[]>();
        for (const cmd of commands) {
            const roleCommands = commandsByRole.get(cmd.actorRoleId) || [];
            roleCommands.push(cmd);
            commandsByRole.set(cmd.actorRoleId, roleCommands);
        }

        // Execute in thu_tu_goi order
        for (const roleId of this.nightOrder) {
            const roleCommands = commandsByRole.get(roleId) || [];

            for (const cmd of roleCommands) {
                const result = this.commandInvoker.execute(cmd, currentState);

                if (result.isSuccess) {
                    currentState = result.newState;

                    // Record effect
                    effects.push({
                        type: 'command_executed',
                        playerId: cmd.actorId,
                        description: cmd.description,
                        metadata: result.metadata
                    });

                    // Record investigation results
                    if (result.metadata.investigationResult) {
                        investigations.push({
                            actorId: cmd.actorId,
                            targetId: result.metadata.targetId,
                            result: result.metadata.investigationResult
                        });
                    }
                }
            }
        }

        return { state: currentState, effects, investigations };
    }

    /**
     * Calculate deaths using bitmask logic
     * 
     * Death conditions:
     * - BITTEN && !PROTECTED && !HEALED && !BLESSED = Death from werewolf
     * - POISONED = Death from witch
     */
    private calculateDeaths(state: GameState): {
        state: GameState;
        deaths: string[];
        saved: string[];
        effects: NightEffect[];
    } {
        let currentState = state;
        const deaths: string[] = [];
        const saved: string[] = [];
        const effects: NightEffect[] = [];

        for (const player of currentState.getAlivePlayers()) {
            const mask = player.statusMask;

            // Check werewolf kill
            if (player.isBitten) {
                if (player.isProtected || player.isHealed || player.isBlessed) {
                    // Player is saved
                    saved.push(player.id);

                    if (player.isProtected) {
                        effects.push({
                            type: 'saved_by_protection',
                            playerId: player.id,
                            description: `${player.name} was saved by guard protection`
                        });
                    }

                    if (player.isHealed) {
                        effects.push({
                            type: 'saved_by_heal',
                            playerId: player.id,
                            description: `${player.name} was saved by witch heal`
                        });
                    }

                    if (player.isBlessed) {
                        effects.push({
                            type: 'saved_by_blessing',
                            playerId: player.id,
                            description: `${player.name} was saved by priest blessing`
                        });
                    }
                } else {
                    // Player dies from werewolf attack
                    deaths.push(player.id);
                    const killedPlayer = player.kill('werewolf');
                    currentState = currentState.updatePlayer(player.id, () => killedPlayer);

                    effects.push({
                        type: 'death_by_werewolf',
                        playerId: player.id,
                        description: `${player.name} was killed by werewolves`
                    });
                }
            }

            // Check witch poison
            if (player.isPoisoned && player.isAlive) {
                deaths.push(player.id);
                const killedPlayer = player.kill('witch_poison');
                currentState = currentState.updatePlayer(player.id, () => killedPlayer);

                effects.push({
                    type: 'death_by_poison',
                    playerId: player.id,
                    description: `${player.name} was poisoned by witch`
                });
            }
        }

        return { state: currentState, deaths, saved, effects };
    }

    /**
     * Apply cascade death effects (lovers, twins)
     */
    private applyCascadeDeaths(
        state: GameState,
        initialDeaths: string[]
    ): {
        state: GameState;
        additionalDeaths: string[];
        effects: NightEffect[];
    } {
        let currentState = state;
        const additionalDeaths: string[] = [];
        const effects: NightEffect[] = [];

        for (const deadPlayerId of initialDeaths) {
            const deadPlayer = currentState.getPlayer(deadPlayerId);
            if (!deadPlayer) continue;

            // Check for lover partner
            if (deadPlayer.isLover && deadPlayer.loverPartnerId) {
                const partner = currentState.getPlayer(deadPlayer.loverPartnerId);

                if (partner && partner.isAlive) {
                    additionalDeaths.push(partner.id);
                    const killedPartner = partner.kill('lover_death');
                    currentState = currentState.updatePlayer(partner.id, () => killedPartner);

                    effects.push({
                        type: 'death_by_lover',
                        playerId: partner.id,
                        description: `${partner.name} died because their lover ${deadPlayer.name} died`,
                        metadata: { partnerId: deadPlayer.id }
                    });
                }
            }

            // Check for twin partner
            if (deadPlayer.isTwin && deadPlayer.twinPartnerId) {
                const twin = currentState.getPlayer(deadPlayer.twinPartnerId);

                if (twin && twin.isAlive) {
                    additionalDeaths.push(twin.id);
                    const killedTwin = twin.kill('twin_death');
                    currentState = currentState.updatePlayer(twin.id, () => killedTwin);

                    effects.push({
                        type: 'death_by_twin',
                        playerId: twin.id,
                        description: `${twin.name} died because their twin ${deadPlayer.name} died`,
                        metadata: { twinId: deadPlayer.id }
                    });
                }
            }
        }

        return { state: currentState, additionalDeaths, effects };
    }

    /**
     * Clear temporary night statuses
     */
    private clearTemporaryStatuses(state: GameState): GameState {
        let currentState = state;

        for (const player of currentState.getAllPlayers()) {
            const clearedMask = clearNightStatuses(player.statusMask);

            if (clearedMask !== player.statusMask) {
                const updatedPlayer = player.update({ statusMask: clearedMask });
                currentState = currentState.updatePlayer(player.id, () => updatedPlayer);
            }
        }

        return currentState;
    }

    /**
     * Generate human-readable messages
     */
    private generateMessages(
        deaths: string[],
        saved: string[],
        effects: NightEffect[]
    ): string[] {
        const messages: string[] = [];

        if (deaths.length === 0) {
            messages.push('Đêm qua bình yên, không ai chết cả.');
        } else {
            const deathDescriptions = effects
                .filter(e => e.type.startsWith('death_'))
                .map(e => e.description);

            messages.push(...deathDescriptions);
        }

        return messages;
    }
}
