/**
 * WinConditionChecker - Checks all win conditions from roles.json
 * Handles team wins, individual wins, and special win conditions
 * 
 * Updated to properly handle:
 * - Lovers from same team: win with their original team
 * - Lovers from different teams: win only if last 2 survivors
 */

import { Team } from '../../assets/role-types';
import { PlayerStateManager, EnhancedPlayerState } from './PlayerStateManager';
import { RoleManager, getRoleManager } from './RoleManager';

export interface WinResult {
    hasWinner: boolean;
    winnerType: 'team' | 'individual' | 'group' | 'none';
    winner?: Team | string;
    winnerPlayerIds?: string[];
    winCondition?: string;
    loversIncluded?: boolean; // Whether lovers are part of the winners
}

export class WinConditionChecker {
    private stateManager: PlayerStateManager;
    private roleManager: RoleManager;

    constructor(stateManager: PlayerStateManager, roleManager?: RoleManager) {
        this.stateManager = stateManager;
        this.roleManager = roleManager || getRoleManager();
    }

    /**
     * Check all win conditions
     */
    checkWinConditions(): WinResult {
        // Check individual win conditions first (they take priority)
        const individualWin = this.checkIndividualWins();
        if (individualWin.hasWinner) {
            return individualWin;
        }

        // Check special group wins
        const groupWin = this.checkGroupWins();
        if (groupWin.hasWinner) {
            return groupWin;
        }

        // Check team wins
        return this.checkTeamWins();
    }

    /**
     * Check team-based win conditions
     */
    private checkTeamWins(): WinResult {
        const alivePlayers = this.stateManager.getAlivePlayers();

        const aliveWerewolves = alivePlayers.filter(p => p.team === 'werewolf');
        const aliveVampires = alivePlayers.filter(p => p.team === 'vampire');
        const aliveVillagers = alivePlayers.filter(p => p.team === 'villager');
        const aliveNeutrals = alivePlayers.filter(p => p.team === 'neutral');

        // Vampire win: all werewolves and villagers dead
        if (aliveVampires.length > 0 && aliveWerewolves.length === 0 && aliveVillagers.length === 0) {
            return {
                hasWinner: true,
                winnerType: 'team',
                winner: 'vampire',
                winnerPlayerIds: aliveVampires.map(p => p.playerId),
                winCondition: 'vampireTeamWins',
            };
        }

        // Werewolf win: werewolves >= all non-werewolves
        const nonWerewolves = alivePlayers.filter(p => p.team !== 'werewolf');
        if (aliveWerewolves.length > 0 && aliveWerewolves.length >= nonWerewolves.length) {
            // Check for Sói Đơn Độc special win
            const soiDonDoc = aliveWerewolves.find(p => p.roleId === 'soi_don_doc');
            if (soiDonDoc && aliveWerewolves.length === 1) {
                return {
                    hasWinner: true,
                    winnerType: 'individual',
                    winner: 'soi_don_doc',
                    winnerPlayerIds: [soiDonDoc.playerId],
                    winCondition: 'beLastWerewolfAlive',
                };
            }

            return {
                hasWinner: true,
                winnerType: 'team',
                winner: 'werewolf',
                winnerPlayerIds: aliveWerewolves.map(p => p.playerId),
                winCondition: 'werewolfTeamWins',
            };
        }

        // Villager win: all werewolves and vampires dead
        if (aliveWerewolves.length === 0 && aliveVampires.length === 0) {
            // At least one villager should be alive
            if (aliveVillagers.length > 0) {
                return {
                    hasWinner: true,
                    winnerType: 'team',
                    winner: 'villager',
                    winnerPlayerIds: aliveVillagers.map(p => p.playerId),
                    winCondition: 'villagerTeamWins',
                };
            }
        }

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check individual win conditions
     */
    private checkIndividualWins(): WinResult {
        const allPlayers = this.stateManager.getAllStates();

        for (const player of allPlayers) {
            const role = this.roleManager.getRoleById(player.roleId);
            if (!role) continue;

            const winCondition = role.winConditions?.primary;

            switch (winCondition) {
                case 'dieByExecution':
                    // Kẻ Chán Đời - wins if executed (not killed by other means)
                    if (!player.isAlive && player.killedBy === 'execution') {
                        return {
                            hasWinner: true,
                            winnerType: 'individual',
                            winner: 'ke_chan_doi',
                            winnerPlayerIds: [player.playerId],
                            winCondition: 'dieByExecution',
                        };
                    }
                    break;

                case 'targetsDeadAndSelfAlive':
                    // Du Côn - marked targets dead and self alive
                    if (player.isAlive && player.markedTargets.length > 0) {
                        const allTargetsDead = player.markedTargets.every(targetId => {
                            const target = this.stateManager.getState(targetId);
                            return target && !target.isAlive;
                        });

                        if (allTargetsDead) {
                            return {
                                hasWinner: true,
                                winnerType: 'individual',
                                winner: 'du_con',
                                winnerPlayerIds: [player.playerId],
                                winCondition: 'targetsDeadAndSelfAlive',
                            };
                        }
                    }
                    break;

                case 'causeMaximumChaos':
                    // Khủng Bố - no actual win, just chaos goal
                    // This is more of a play style than a win condition
                    break;
            }
        }

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check group win conditions (lovers, twins, cult)
     */
    private checkGroupWins(): WinResult {
        const alivePlayers = this.stateManager.getAlivePlayers();

        // Check cult win
        const cultWin = this.checkCultWin(alivePlayers);
        if (cultWin.hasWinner) return cultWin;

        // Check lovers win
        const loversWin = this.checkLoversWin(alivePlayers);
        if (loversWin.hasWinner) return loversWin;

        // Check twins win
        const twinsWin = this.checkTwinsWin(alivePlayers);
        if (twinsWin.hasWinner) return twinsWin;

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check cult leader win condition
     */
    private checkCultWin(alivePlayers: EnhancedPlayerState[]): WinResult {
        // Find cult leader
        const cultLeader = alivePlayers.find(p => p.roleId === 'chu_giao_phai');
        if (!cultLeader) {
            return { hasWinner: false, winnerType: 'none' };
        }

        // Check if all alive players are cult members
        const allAreCult = alivePlayers.every(p => p.isCultMember || p.roleId === 'chu_giao_phai');

        if (allAreCult) {
            return {
                hasWinner: true,
                winnerType: 'group',
                winner: 'cult',
                winnerPlayerIds: alivePlayers.map(p => p.playerId),
                winCondition: 'allAliveBelongToCult',
            };
        }

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check lovers win condition
     * - Same team lovers: They win with their team (no special win)
     * - Different team lovers: They win ONLY if they are the last 2 alive
     */
    private checkLoversWin(alivePlayers: EnhancedPlayerState[]): WinResult {
        // First, check if there are any lovers
        const lovers = alivePlayers.filter(p => p.isLovers);
        
        if (lovers.length !== 2) {
            return { hasWinner: false, winnerType: 'none' };
        }

        const [player1, player2] = lovers;

        // Verify they are actually partners
        if (player1.loverPartnerId !== player2.playerId) {
            return { hasWinner: false, winnerType: 'none' };
        }

        // Get original teams from metadata (stored when Cupid created lovers)
        const originalTeam1 = player1.originalTeam || player1.team;
        const originalTeam2 = player2.originalTeam || player2.team;
        const sameOriginalTeam = originalTeam1 === originalTeam2;

        // Case 1: Same team lovers - they don't have a special win condition
        // They will win when their team wins (handled by team win check)
        if (sameOriginalTeam) {
            return { hasWinner: false, winnerType: 'none' };
        }

        // Case 2: Different team lovers - win only if they are the last 2 alive
        if (alivePlayers.length === 2) {
            return {
                hasWinner: true,
                winnerType: 'group',
                winner: 'lovers',
                winnerPlayerIds: [player1.playerId, player2.playerId],
                winCondition: 'beLastTwoSurvivors',
            };
        }

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check twins win condition
     */
    private checkTwinsWin(alivePlayers: EnhancedPlayerState[]): WinResult {
        // Check if exactly 2 players alive and they are twins
        if (alivePlayers.length === 2) {
            const [player1, player2] = alivePlayers;

            if (player1.isTwin && player2.isTwin &&
                player1.twinPartnerId === player2.playerId) {
                return {
                    hasWinner: true,
                    winnerType: 'group',
                    winner: 'twins',
                    winnerPlayerIds: [player1.playerId, player2.playerId],
                    winCondition: 'beLastTwoSurvivors',
                };
            }
        }

        return { hasWinner: false, winnerType: 'none' };
    }

    /**
     * Check if a specific player has won based on their personal win condition
     */
    checkPlayerWin(playerId: string): WinResult {
        const state = this.stateManager.getState(playerId);
        if (!state) {
            return { hasWinner: false, winnerType: 'none' };
        }

        const gameWin = this.checkWinConditions();

        // If game has a winner, check if this player is included
        if (gameWin.hasWinner && gameWin.winnerPlayerIds?.includes(playerId)) {
            return gameWin;
        }

        // Check if player's team won
        const role = this.roleManager.getRoleById(state.roleId);
        if (!role) {
            return { hasWinner: false, winnerType: 'none' };
        }

        const winCondition = role.winConditions?.primary;

        if (gameWin.hasWinner && gameWin.winnerType === 'team') {
            // Check simple team wins
            if (winCondition === 'villagerTeamWins' && gameWin.winner === 'villager') {
                return {
                    hasWinner: true,
                    winnerType: 'team',
                    winner: 'villager',
                    winnerPlayerIds: gameWin.winnerPlayerIds,
                    winCondition,
                };
            }
            if (winCondition === 'werewolfTeamWins' && gameWin.winner === 'werewolf') {
                return {
                    hasWinner: true,
                    winnerType: 'team',
                    winner: 'werewolf',
                    winnerPlayerIds: gameWin.winnerPlayerIds,
                    winCondition,
                };
            }
            if (winCondition === 'vampireTeamWins' && gameWin.winner === 'vampire') {
                return {
                    hasWinner: true,
                    winnerType: 'team',
                    winner: 'vampire',
                    winnerPlayerIds: gameWin.winnerPlayerIds,
                    winCondition,
                };
            }
        }

        // Check alternative win conditions
        const altConditions = role.winConditions?.alternative;
        if (altConditions?.includes('loversWin') && gameWin.winner === 'lovers') {
            if (gameWin.winnerPlayerIds?.includes(playerId)) {
                return gameWin;
            }
        }

        return { hasWinner: false, winnerType: 'none' };
    }
}
