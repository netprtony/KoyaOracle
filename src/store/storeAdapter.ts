/**
 * Store Adapter - Bridges domain layer with Zustand store
 * 
 * Converts between domain entities and store types for backward compatibility
 */

import { Player as DomainPlayer } from '../domain/entities/Player';
import { GameState as DomainGameState } from '../domain/entities/GameState';
import { PlayerStatus } from '../domain/entities/PlayerStatus';
import { Player as StorePlayer } from '../types';

/**
 * Convert domain Player to store Player
 */
export function domainPlayerToStore(domainPlayer: DomainPlayer): StorePlayer {
    return {
        id: domainPlayer.id,
        name: domainPlayer.name,
        color: domainPlayer.metadata.color || '#000000',
        roleId: domainPlayer.roleId,
        isAlive: domainPlayer.isAlive,
        position: domainPlayer.position
    };
}

/**
 * Convert store Player to domain Player
 */
export function storePlayerToDomain(storePlayer: StorePlayer): DomainPlayer {
    const statusMask = storePlayer.isAlive ? PlayerStatus.ALIVE : PlayerStatus.NONE;

    return new DomainPlayer(
        storePlayer.id,
        storePlayer.name,
        storePlayer.roleId || '',
        'villager', // Default team, should be determined from role
        statusMask,
        storePlayer.position,
        { color: storePlayer.color }
    );
}

/**
 * Convert domain GameState to store players array
 */
export function domainStateToStorePlayers(domainState: DomainGameState): StorePlayer[] {
    return domainState.getAllPlayers().map(domainPlayerToStore);
}

/**
 * Convert store players array to domain GameState
 */
export function storePlayersToDomainState(
    storePlayers: StorePlayer[],
    nightNumber: number = 0
): DomainGameState {
    const domainPlayers = storePlayers.map(storePlayerToDomain);
    const state = DomainGameState.fromPlayers(domainPlayers);
    return new DomainGameState(
        state.players,
        nightNumber,
        state.phase,
        state.metadata
    );
}
