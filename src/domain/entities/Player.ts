/**
 * Player - Domain entity representing a player in the game
 * 
 * Uses bitmask for efficient status tracking and immutable pattern
 * for predictable state management.
 */

import { Team } from '../../../assets/role-types';
import {
    PlayerStatus,
    hasStatus,
    addStatus,
    removeStatus,
    getStatusNames
} from './PlayerStatus';

export class Player {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly roleId: string,
        public readonly team: Team,
        public readonly statusMask: number = PlayerStatus.ALIVE,
        public readonly position: number = 0,
        public readonly metadata: PlayerMetadata = {}
    ) { }

    // ============================================
    // Bitmask Operations (Immutable)
    // ============================================

    /**
     * Check if player has a specific status
     */
    hasStatus(status: PlayerStatus): boolean {
        return hasStatus(this.statusMask, status);
    }

    /**
     * Add a status to the player (returns new Player instance)
     */
    addStatus(status: PlayerStatus): Player {
        return new Player(
            this.id,
            this.name,
            this.roleId,
            this.team,
            addStatus(this.statusMask, status),
            this.position,
            this.metadata
        );
    }

    /**
     * Remove a status from the player (returns new Player instance)
     */
    removeStatus(status: PlayerStatus): Player {
        return new Player(
            this.id,
            this.name,
            this.roleId,
            this.team,
            removeStatus(this.statusMask, status),
            this.position,
            this.metadata
        );
    }

    /**
     * Update multiple properties at once (returns new Player instance)
     */
    update(updates: Partial<{
        roleId: string;
        team: Team;
        statusMask: number;
        position: number;
        metadata: PlayerMetadata;
    }>): Player {
        return new Player(
            this.id,
            this.name,
            updates.roleId ?? this.roleId,
            updates.team ?? this.team,
            updates.statusMask ?? this.statusMask,
            updates.position ?? this.position,
            updates.metadata ?? this.metadata
        );
    }

    // ============================================
    // Derived Properties (Computed from bitmask)
    // ============================================

    get isAlive(): boolean {
        return this.hasStatus(PlayerStatus.ALIVE);
    }

    get isDead(): boolean {
        return !this.isAlive;
    }

    get isProtected(): boolean {
        return this.hasStatus(PlayerStatus.PROTECTED);
    }

    get isBitten(): boolean {
        return this.hasStatus(PlayerStatus.BITTEN);
    }

    get isHealed(): boolean {
        return this.hasStatus(PlayerStatus.HEALED);
    }

    get isPoisoned(): boolean {
        return this.hasStatus(PlayerStatus.POISONED);
    }

    get isBlessed(): boolean {
        return this.hasStatus(PlayerStatus.BLESSED);
    }

    get isSilenced(): boolean {
        return this.hasStatus(PlayerStatus.SILENCED);
    }

    get isExiled(): boolean {
        return this.hasStatus(PlayerStatus.EXILED);
    }

    get isLover(): boolean {
        return this.hasStatus(PlayerStatus.IS_LOVER);
    }

    get isTwin(): boolean {
        return this.hasStatus(PlayerStatus.IS_TWIN);
    }

    get isInCult(): boolean {
        return this.hasStatus(PlayerStatus.IN_CULT);
    }

    get isTransformed(): boolean {
        return this.hasStatus(PlayerStatus.TRANSFORMED);
    }

    get isMarkedForDeath(): boolean {
        return this.hasStatus(PlayerStatus.MARKED_FOR_DEATH);
    }

    get isInfected(): boolean {
        return this.hasStatus(PlayerStatus.INFECTED);
    }

    /**
     * Check if player should die based on night resolution logic
     * Death condition: BITTEN && !PROTECTED && !HEALED && !BLESSED
     */
    get shouldDieFromNight(): boolean {
        return (
            this.isBitten &&
            !this.isProtected &&
            !this.isHealed &&
            !this.isBlessed
        );
    }

    /**
     * Check if player should die from poison
     */
    get shouldDieFromPoison(): boolean {
        return this.isPoisoned && this.isAlive;
    }

    // ============================================
    // Metadata Access
    // ============================================

    get loverPartnerId(): string | undefined {
        return this.metadata.loverPartnerId;
    }

    get twinPartnerId(): string | undefined {
        return this.metadata.twinPartnerId;
    }

    get originalRoleId(): string | undefined {
        return this.metadata.originalRoleId;
    }

    get killedBy(): string | undefined {
        return this.metadata.killedBy;
    }

    get lastProtectedTargetId(): string | undefined {
        return this.metadata.lastProtectedTargetId;
    }

    get lastSilencedTargetId(): string | undefined {
        return this.metadata.lastSilencedTargetId;
    }

    get voteWeight(): number {
        return this.metadata.voteWeight ?? 1;
    }

    get deathDelay(): number {
        return this.metadata.deathDelay ?? 0;
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Get human-readable status description
     */
    getStatusDescription(): string[] {
        return getStatusNames(this.statusMask);
    }

    /**
     * Create a copy with updated metadata
     */
    withMetadata(updates: Partial<PlayerMetadata>): Player {
        return new Player(
            this.id,
            this.name,
            this.roleId,
            this.team,
            this.statusMask,
            this.position,
            { ...this.metadata, ...updates }
        );
    }

    /**
     * Kill the player (remove ALIVE status)
     */
    kill(killedBy?: string): Player {
        return this.removeStatus(PlayerStatus.ALIVE)
            .withMetadata({ killedBy });
    }

    /**
     * Revive the player (add ALIVE status)
     */
    revive(): Player {
        return this.addStatus(PlayerStatus.ALIVE);
    }

    /**
     * Transform player to a new role (e.g., Cursed -> Werewolf)
     */
    transform(newRoleId: string, newTeam: Team): Player {
        return this.update({
            roleId: newRoleId,
            team: newTeam,
            statusMask: addStatus(this.statusMask, PlayerStatus.TRANSFORMED),
            metadata: {
                ...this.metadata,
                originalRoleId: this.roleId
            }
        });
    }

    /**
     * Create lovers relationship
     */
    setLover(partnerId: string): Player {
        return this.addStatus(PlayerStatus.IS_LOVER)
            .withMetadata({ loverPartnerId: partnerId });
    }

    /**
     * Create twins relationship
     */
    setTwin(partnerId: string): Player {
        return this.addStatus(PlayerStatus.IS_TWIN)
            .withMetadata({ twinPartnerId: partnerId });
    }

    /**
     * Set mayor status (double vote weight)
     */
    setMayor(): Player {
        return this.withMetadata({ voteWeight: 2 });
    }

    /**
     * Remove mayor status
     */
    removeMayor(): Player {
        return this.withMetadata({ voteWeight: 1 });
    }

    /**
     * Clone player (for testing or state snapshots)
     */
    clone(): Player {
        return new Player(
            this.id,
            this.name,
            this.roleId,
            this.team,
            this.statusMask,
            this.position,
            { ...this.metadata }
        );
    }

    /**
     * Convert to plain object (for serialization)
     */
    toJSON(): PlayerJSON {
        return {
            id: this.id,
            name: this.name,
            roleId: this.roleId,
            team: this.team,
            statusMask: this.statusMask,
            position: this.position,
            metadata: this.metadata
        };
    }

    /**
     * Create Player from plain object (for deserialization)
     */
    static fromJSON(json: PlayerJSON): Player {
        return new Player(
            json.id,
            json.name,
            json.roleId,
            json.team,
            json.statusMask,
            json.position,
            json.metadata
        );
    }
}

// ============================================
// Supporting Types
// ============================================

/**
 * Metadata for additional player information
 * that doesn't fit in the bitmask
 */
export interface PlayerMetadata {
    loverPartnerId?: string;
    twinPartnerId?: string;
    originalRoleId?: string;
    killedBy?: string;
    lastProtectedTargetId?: string;
    lastSilencedTargetId?: string;
    voteWeight?: number;
    deathDelay?: number;
    [key: string]: any; // Allow custom metadata
}

/**
 * JSON representation of Player for serialization
 */
export interface PlayerJSON {
    id: string;
    name: string;
    roleId: string;
    team: Team;
    statusMask: number;
    position: number;
    metadata: PlayerMetadata;
}
