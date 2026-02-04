/**
 * LoversLinkedFateHandler - Handles the linked fate system for lovers
 * 
 * When one lover dies, the other dies too (from heartbreak).
 * This module provides utilities for checking and processing linked fate deaths.
 */

import { GameState } from '../entities/GameState';
import { Player } from '../entities/Player';
import { PlayerStatus } from '../entities/PlayerStatus';

export interface LinkedFateDeathResult {
    state: GameState;
    partnerDied: boolean;
    partnerId?: string;
    partnerName?: string;
    message: string;
}

export interface DeathProcessResult {
    state: GameState;
    deaths: Array<{
        playerId: string;
        playerName: string;
        cause: string;
        isLinkedFateDeath: boolean;
    }>;
    messages: string[];
}

/**
 * Check if a player has a lover partner
 */
export function hasLoverPartner(player: Player): boolean {
    return player.isLover && !!player.loverPartnerId;
}

/**
 * Get the lover partner of a player
 */
export function getLoverPartner(player: Player, state: GameState): Player | undefined {
    if (!hasLoverPartner(player)) {
        return undefined;
    }
    return state.getPlayer(player.loverPartnerId!);
}

/**
 * Check if the player's death should trigger their lover's death
 */
export function shouldTriggerLoverDeath(player: Player, state: GameState): boolean {
    if (!hasLoverPartner(player)) {
        return false;
    }

    const partner = getLoverPartner(player, state);
    if (!partner) {
        return false;
    }

    // Partner must be alive for linked fate to trigger
    return partner.isAlive;
}

/**
 * Process linked fate death for a lover
 * Returns updated state with partner killed if applicable
 */
export function processLinkedFateDeath(
    deadPlayer: Player,
    state: GameState
): LinkedFateDeathResult {
    if (!shouldTriggerLoverDeath(deadPlayer, state)) {
        return {
            state,
            partnerDied: false,
            message: ''
        };
    }

    const partner = getLoverPartner(deadPlayer, state)!;
    
    // Kill the partner due to linked fate (heartbreak)
    const killedPartner = partner.kill('lover_heartbreak');
    const newState = state.updatePlayer(partner.id, () => killedPartner);

    return {
        state: newState,
        partnerDied: true,
        partnerId: partner.id,
        partnerName: partner.name,
        message: `💔 ${partner.name} chết vì đau khổ khi mất đi người yêu ${deadPlayer.name}`
    };
}

/**
 * Process all deaths in a batch, handling linked fate correctly
 * Prevents infinite loops by processing deaths in order
 */
export function processDeathsWithLinkedFate(
    deathQueue: Array<{ playerId: string; cause: string }>,
    state: GameState
): DeathProcessResult {
    let currentState = state;
    const processedDeaths: Set<string> = new Set();
    const allDeaths: DeathProcessResult['deaths'] = [];
    const messages: string[] = [];

    // Queue to process deaths including cascaded ones
    const queue = [...deathQueue];

    while (queue.length > 0) {
        const death = queue.shift()!;
        
        // Skip if already processed (prevents infinite loop)
        if (processedDeaths.has(death.playerId)) {
            continue;
        }

        const player = currentState.getPlayer(death.playerId);
        if (!player || !player.isAlive) {
            continue;
        }

        // Process primary death
        const killedPlayer = player.kill(death.cause);
        currentState = currentState.updatePlayer(player.id, () => killedPlayer);
        processedDeaths.add(player.id);

        allDeaths.push({
            playerId: player.id,
            playerName: player.name,
            cause: death.cause,
            isLinkedFateDeath: false
        });

        // Check for linked fate (lover death)
        if (hasLoverPartner(player)) {
            const partner = getLoverPartner(player, currentState);
            if (partner && partner.isAlive && !processedDeaths.has(partner.id)) {
                // Add partner to death queue
                queue.push({
                    playerId: partner.id,
                    cause: 'lover_heartbreak'
                });

                allDeaths.push({
                    playerId: partner.id,
                    playerName: partner.name,
                    cause: 'lover_heartbreak',
                    isLinkedFateDeath: true
                });

                const killedPartner = partner.kill('lover_heartbreak');
                currentState = currentState.updatePlayer(partner.id, () => killedPartner);
                processedDeaths.add(partner.id);

                messages.push(`💔 ${partner.name} chết vì đau khổ khi mất đi người yêu ${player.name}`);
            }
        }
    }

    return {
        state: currentState,
        deaths: allDeaths,
        messages
    };
}

/**
 * Check if lovers win condition is met
 * Different team lovers win if they are the last 2 alive
 */
export function checkLoversWinCondition(state: GameState): {
    isWin: boolean;
    loversInfo?: {
        player1Id: string;
        player2Id: string;
        player1Name: string;
        player2Name: string;
    };
} {
    const loversData = state.metadata.lovers;
    if (!loversData) {
        return { isWin: false };
    }

    const lover1 = state.getPlayer(loversData.player1Id);
    const lover2 = state.getPlayer(loversData.player2Id);

    if (!lover1 || !lover2) {
        return { isWin: false };
    }

    // Both must be alive
    if (!lover1.isAlive || !lover2.isAlive) {
        return { isWin: false };
    }

    const alivePlayers = state.getAlivePlayers();

    // Case 1: Same team lovers - they win with their team
    if (loversData.sameTeam) {
        // They don't have a special win condition, they win with their team
        return { isWin: false };
    }

    // Case 2: Different team lovers - win only if they are the last 2 alive
    if (alivePlayers.length === 2) {
        const aliveIds = alivePlayers.map((p: Player) => p.id);
        if (aliveIds.includes(lover1.id) && aliveIds.includes(lover2.id)) {
            return {
                isWin: true,
                loversInfo: {
                    player1Id: lover1.id,
                    player2Id: lover2.id,
                    player1Name: lover1.name,
                    player2Name: lover2.name
                }
            };
        }
    }

    return { isWin: false };
}

/**
 * Check if player is protected from death by lover's blessing
 * (Edge case: If lover A is blessed and attacked, does lover B still die?)
 * Current implementation: Lover B does NOT die because Lover A survived
 */
export function isProtectedByLoverBlessing(
    playerId: string,
    state: GameState
): boolean {
    const player = state.getPlayer(playerId);
    if (!player || !player.isLover) {
        return false;
    }

    const partner = getLoverPartner(player, state);
    if (!partner) {
        return false;
    }

    // If partner is blessed and was attacked but survived,
    // linked fate doesn't trigger because partner didn't die
    return partner.isBlessed && partner.isBitten;
}
