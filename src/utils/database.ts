import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { GameSession, Player, MatchLogEntry, Phase } from '../types';

// Database name
const DATABASE_NAME = 'werewolf_gm.db';

// Match history record
export interface MatchRecord {
    id: string;
    scenarioId: string;
    mode: string;
    playersJson: string;
    logJson: string;
    winner: string | null;
    createdAt: number;
    endedAt: number | null;
}

// Player record for statistics
export interface PlayerRecord {
    id: number;
    name: string;
    color: string;
    gamesPlayed: number;
    gamesWon: number;
    lastPlayed: number;
}

// Settings record
export interface SettingRecord {
    key: string;
    value: string;
}

/**
 * Database service for SQLite operations
 * Only works on native platforms (iOS/Android)
 */
class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private isWeb: boolean = Platform.OS === 'web';

    /**
     * Initialize the database
     */
    async initialize(): Promise<void> {
        if (this.isWeb) {
            console.log('SQLite not available on web, using fallback storage');
            return;
        }

        try {
            this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
            await this.createTables();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Create database tables
     */
    private async createTables(): Promise<void> {
        if (!this.db) return;

        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS matches (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                players_json TEXT NOT NULL,
                log_json TEXT NOT NULL,
                winner TEXT,
                created_at INTEGER NOT NULL,
                ended_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#6366f1',
                games_played INTEGER NOT NULL DEFAULT 0,
                games_won INTEGER NOT NULL DEFAULT 0,
                last_played INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
            CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
        `);
    }

    /**
     * Check if database is available
     */
    isAvailable(): boolean {
        return !this.isWeb && this.db !== null;
    }

    // ==========================================
    // MATCH OPERATIONS
    // ==========================================

    /**
     * Save a match to history
     */
    async saveMatch(session: GameSession, winner?: string): Promise<void> {
        if (!this.db) return;

        const now = Date.now();
        await this.db.runAsync(
            `INSERT OR REPLACE INTO matches (id, scenario_id, mode, players_json, log_json, winner, created_at, ended_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            session.id,
            session.scenarioId,
            session.mode,
            JSON.stringify(session.players),
            JSON.stringify(session.matchLog),
            winner || null,
            session.createdAt,
            now
        );
    }

    /**
     * Get all matches (most recent first)
     */
    async getMatches(limit: number = 50): Promise<MatchRecord[]> {
        if (!this.db) return [];

        const result = await this.db.getAllAsync<{
            id: string;
            scenario_id: string;
            mode: string;
            players_json: string;
            log_json: string;
            winner: string | null;
            created_at: number;
            ended_at: number | null;
        }>(
            `SELECT * FROM matches ORDER BY created_at DESC LIMIT ?`,
            limit
        );

        return result.map(row => ({
            id: row.id,
            scenarioId: row.scenario_id,
            mode: row.mode,
            playersJson: row.players_json,
            logJson: row.log_json,
            winner: row.winner,
            createdAt: row.created_at,
            endedAt: row.ended_at,
        }));
    }

    /**
     * Get a specific match by ID
     */
    async getMatch(matchId: string): Promise<MatchRecord | null> {
        if (!this.db) return null;

        const result = await this.db.getFirstAsync<{
            id: string;
            scenario_id: string;
            mode: string;
            players_json: string;
            log_json: string;
            winner: string | null;
            created_at: number;
            ended_at: number | null;
        }>(
            `SELECT * FROM matches WHERE id = ?`,
            matchId
        );

        if (!result) return null;

        return {
            id: result.id,
            scenarioId: result.scenario_id,
            mode: result.mode,
            playersJson: result.players_json,
            logJson: result.log_json,
            winner: result.winner,
            createdAt: result.created_at,
            endedAt: result.ended_at,
        };
    }

    /**
     * Delete a match
     */
    async deleteMatch(matchId: string): Promise<void> {
        if (!this.db) return;
        await this.db.runAsync(`DELETE FROM matches WHERE id = ?`, matchId);
    }

    // ==========================================
    // PLAYER OPERATIONS
    // ==========================================

    /**
     * Add or update a player
     */
    async upsertPlayer(name: string, color: string): Promise<void> {
        if (!this.db) return;

        const existing = await this.db.getFirstAsync<{ id: number }>(
            `SELECT id FROM players WHERE name = ?`,
            name
        );

        if (existing) {
            await this.db.runAsync(
                `UPDATE players SET color = ?, last_played = ? WHERE id = ?`,
                color,
                Date.now(),
                existing.id
            );
        } else {
            await this.db.runAsync(
                `INSERT INTO players (name, color, games_played, games_won, last_played)
                 VALUES (?, ?, 0, 0, ?)`,
                name,
                color,
                Date.now()
            );
        }
    }

    /**
     * Get all players
     */
    async getPlayers(): Promise<PlayerRecord[]> {
        if (!this.db) return [];

        const result = await this.db.getAllAsync<{
            id: number;
            name: string;
            color: string;
            games_played: number;
            games_won: number;
            last_played: number;
        }>(`SELECT * FROM players ORDER BY last_played DESC`);

        return result.map(row => ({
            id: row.id,
            name: row.name,
            color: row.color,
            gamesPlayed: row.games_played,
            gamesWon: row.games_won,
            lastPlayed: row.last_played,
        }));
    }

    /**
     * Update player statistics after a game
     */
    async updatePlayerStats(name: string, won: boolean): Promise<void> {
        if (!this.db) return;

        await this.db.runAsync(
            `UPDATE players 
             SET games_played = games_played + 1,
                 games_won = games_won + ?,
                 last_played = ?
             WHERE name = ?`,
            won ? 1 : 0,
            Date.now(),
            name
        );
    }

    /**
     * Delete a player by ID
     */
    async deletePlayer(id: number): Promise<void> {
        if (!this.db) return;
        await this.db.runAsync(`DELETE FROM players WHERE id = ?`, id);
    }

    /**
     * Search players by name
     */
    async searchPlayers(query: string): Promise<PlayerRecord[]> {
        if (!this.db) return [];

        const result = await this.db.getAllAsync<{
            id: number;
            name: string;
            color: string;
            games_played: number;
            games_won: number;
            last_played: number;
        }>(
            `SELECT * FROM players WHERE name LIKE ? ORDER BY last_played DESC`,
            `%${query}%`
        );

        return result.map(row => ({
            id: row.id,
            name: row.name,
            color: row.color,
            gamesPlayed: row.games_played,
            gamesWon: row.games_won,
            lastPlayed: row.last_played,
        }));
    }

    // ==========================================
    // SETTINGS OPERATIONS
    // ==========================================

    /**
     * Save a setting
     */
    async saveSetting(key: string, value: string): Promise<void> {
        if (!this.db) return;

        await this.db.runAsync(
            `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
            key,
            value
        );
    }

    /**
     * Get a setting
     */
    async getSetting(key: string): Promise<string | null> {
        if (!this.db) return null;

        const result = await this.db.getFirstAsync<{ value: string }>(
            `SELECT value FROM settings WHERE key = ?`,
            key
        );

        return result?.value || null;
    }

    /**
     * Get setting with default value
     */
    async getSettingWithDefault(key: string, defaultValue: string): Promise<string> {
        const value = await this.getSetting(key);
        return value ?? defaultValue;
    }

    /**
     * Delete a setting
     */
    async deleteSetting(key: string): Promise<void> {
        if (!this.db) return;
        await this.db.runAsync(`DELETE FROM settings WHERE key = ?`, key);
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
        }
    }

    /**
     * Clear all data (for debugging)
     */
    async clearAll(): Promise<void> {
        if (!this.db) return;

        await this.db.execAsync(`
            DELETE FROM matches;
            DELETE FROM players;
            DELETE FROM settings;
        `);
    }
}

// Export singleton instance
export const database = new DatabaseService();
