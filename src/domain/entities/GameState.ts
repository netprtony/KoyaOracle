/**
 * GameState - Domain entity representing the complete game state
 * 
 * Immutable state container for all game data.
 * Uses Map for O(1) player lookups.
 */

import { Player } from './Player';
import { Team } from '../../../assets/role-types';
import { PlayerStatus } from './PlayerStatus';

export type GamePhase = 'night' | 'day' | 'gameOver';

export class GameState {
    constructor(
        public readonly players: Map<string, Player>,
        public readonly nightNumber: number = 0,
        public readonly phase: GamePhase = 'night',
        public readonly metadata: GameMetadata = {}
    ) { }

    // ============================================
    // Player Access Methods
    // ============================================

    /**
     * Get player by ID
     */
    getPlayer(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    /**
     * Get all players as array
     */
    getAllPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    /**
     * Get alive players
     */
    getAlivePlayers(): Player[] {
        return this.getAllPlayers().filter(p => p.isAlive);
    }

    /**
     * Get dead players
     */
    getDeadPlayers(): Player[] {
        return this.getAllPlayers().filter(p => p.isDead);
    }

    /**
     * Get players by team
     */
    getPlayersByTeam(team: Team): Player[] {
        return this.getAllPlayers().filter(p => p.team === team);
    }

    /**
     * Get alive players by team
     */
    getAlivePlayersByTeam(team: Team): Player[] {
        return this.getAlivePlayers().filter(p => p.team === team);
    }

    /**
     * Get players by role
     */
    getPlayersByRole(roleId: string): Player[] {
        return this.getAllPlayers().filter(p => p.roleId === roleId);
    }

    /**
     * Get alive players by role
     */
    getAlivePlayersByRole(roleId: string): Player[] {
        return this.getAlivePlayers().filter(p => p.roleId === roleId);
    }

    /**
     * Get players with specific status
     */
    getPlayersWithStatus(status: PlayerStatus): Player[] {
        return this.getAllPlayers().filter(p => p.hasStatus(status));
    }

    // ============================================
    // State Update Methods (Immutable)
    // ============================================

    /**
     * Update a single player (returns new GameState)
     */
    updatePlayer(playerId: string, updater: (player: Player) => Player): GameState {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Player ${playerId} not found`);
            return this;
        }

        const updatedPlayer = updater(player);
        const newPlayers = new Map(this.players);
        newPlayers.set(playerId, updatedPlayer);

        return new GameState(
            newPlayers,
            this.nightNumber,
            this.phase,
            this.metadata
        );
    }

    /**
     * Update multiple players at once
     */
    updatePlayers(updates: Map<string, (player: Player) => Player>): GameState {
        const newPlayers = new Map(this.players);

        for (const [playerId, updater] of updates) {
            const player = newPlayers.get(playerId);
            if (player) {
                newPlayers.set(playerId, updater(player));
            }
        }

        return new GameState(
            newPlayers,
            this.nightNumber,
            this.phase,
            this.metadata
        );
    }

    /**
     * Add a new player to the game
     */
    addPlayer(player: Player): GameState {
        const newPlayers = new Map(this.players);
        newPlayers.set(player.id, player);

        return new GameState(
            newPlayers,
            this.nightNumber,
            this.phase,
            this.metadata
        );
    }

    /**
     * Remove a player from the game
     */
    removePlayer(playerId: string): GameState {
        const newPlayers = new Map(this.players);
        newPlayers.delete(playerId);

        return new GameState(
            newPlayers,
            this.nightNumber,
            this.phase,
            this.metadata
        );
    }

    // ============================================
    // Phase Management
    // ============================================

    /**
     * Advance to next night
     */
    advanceToNight(): GameState {
        return new GameState(
            this.players,
            this.nightNumber + 1,
            'night',
            this.metadata
        );
    }

    /**
     * Advance to day
     */
    advanceToDay(): GameState {
        return new GameState(
            this.players,
            this.nightNumber,
            'day',
            this.metadata
        );
    }

    /**
     * End game
     */
    endGame(winner?: Team | 'lovers' | 'cult' | string): GameState {
        return new GameState(
            this.players,
            this.nightNumber,
            'gameOver',
            { ...this.metadata, winner }
        );
    }

    // ============================================
    // Metadata Management
    // ============================================

    /**
     * Update game metadata
     */
    withMetadata(updates: Partial<GameMetadata>): GameState {
        return new GameState(
            this.players,
            this.nightNumber,
            this.phase,
            { ...this.metadata, ...updates }
        );
    }

    // ============================================
    // Game Statistics
    // ============================================

    /**
     * Get total player count
     */
    get totalPlayers(): number {
        return this.players.size;
    }

    /**
     * Get alive player count
     */
    get aliveCount(): number {
        return this.getAlivePlayers().length;
    }

    /**
     * Get dead player count
     */
    get deadCount(): number {
        return this.getDeadPlayers().length;
    }

    /**
     * Get team counts
     */
    getTeamCounts(): Map<Team, number> {
        const counts = new Map<Team, number>();

        for (const player of this.getAlivePlayers()) {
            counts.set(player.team, (counts.get(player.team) || 0) + 1);
        }

        return counts;
    }

    /**
     * Check if game is over
     */
    get isGameOver(): boolean {
        return this.phase === 'gameOver';
    }

    /**
     * Get winner (if game is over)
     */
    get winner(): Team | string | undefined {
        return this.metadata.winner;
    }

    // ============================================
    // Serialization
    // ============================================

    /**
     * Convert to plain object for serialization
     */
    toJSON(): GameStateJSON {
        const playersArray = Array.from(this.players.values()).map(p => p.toJSON());

        return {
            players: playersArray,
            nightNumber: this.nightNumber,
            phase: this.phase,
            metadata: this.metadata
        };
    }

    /**
     * Create GameState from plain object
     */
    static fromJSON(json: GameStateJSON): GameState {
        const playersMap = new Map<string, Player>();

        for (const playerJSON of json.players) {
            const player = Player.fromJSON(playerJSON);
            playersMap.set(player.id, player);
        }

        return new GameState(
            playersMap,
            json.nightNumber,
            json.phase,
            json.metadata
        );
    }

    /**
     * Create empty game state
     */
    static empty(): GameState {
        return new GameState(new Map(), 0, 'night', {});
    }

    /**
     * Create game state from player list
     */
    static fromPlayers(players: Player[]): GameState {
        const playersMap = new Map<string, Player>();

        for (const player of players) {
            playersMap.set(player.id, player);
        }

        return new GameState(playersMap, 0, 'night', {});
    }
}

// ============================================
// Supporting Types
// ============================================

/**
 * Game metadata for additional information
 */
export interface GameMetadata {
    winner?: Team | 'lovers' | 'cult' | string;
    scenarioId?: string;
    nightOrder?: string[];
    [key: string]: any;
}

/**
 * JSON representation for serialization
 */
export interface GameStateJSON {
    players: any[]; // PlayerJSON[]
    nightNumber: number;
    phase: GamePhase;
    metadata: GameMetadata;
}
