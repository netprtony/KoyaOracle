/**
 * BaseCommand - Abstract base class for all commands
 * 
 * Provides common functionality for command implementations
 * including ID generation, timestamp tracking, and basic validation.
 */

import { ICommand } from './ICommand';
import { GameState } from '../entities/GameState';
import { CommandResult } from './CommandResult';

export abstract class BaseCommand implements ICommand {
    public readonly id: string;
    public readonly timestamp: number;

    constructor(
        public readonly actorId: string,
        public readonly actorRoleId: string,
        public readonly targetIds: string[] = []
    ) {
        this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.timestamp = Date.now();
    }

    // ============================================
    // Abstract Methods (Must be implemented by subclasses)
    // ============================================

    /**
     * Execute the command
     */
    abstract execute(state: GameState): CommandResult;

    /**
     * Undo the command
     */
    abstract undo(state: GameState): CommandResult;

    /**
     * Check if command can execute
     */
    abstract canExecute(state: GameState): boolean;

    /**
     * Human-readable description
     */
    abstract get description(): string;

    // ============================================
    // Common Validation Helpers
    // ============================================

    /**
     * Validate that actor exists and is alive
     */
    protected validateActor(state: GameState): { valid: boolean; message?: string } {
        const actor = state.getPlayer(this.actorId);

        if (!actor) {
            return { valid: false, message: `Actor ${this.actorId} not found` };
        }

        if (!actor.isAlive) {
            return { valid: false, message: `Actor ${actor.name} is dead` };
        }

        if (actor.roleId !== this.actorRoleId) {
            return { valid: false, message: `Actor role mismatch` };
        }

        return { valid: true };
    }

    /**
     * Validate that all targets exist and are alive
     */
    protected validateTargets(state: GameState, requireAlive: boolean = true): { valid: boolean; message?: string } {
        for (const targetId of this.targetIds) {
            const target = state.getPlayer(targetId);

            if (!target) {
                return { valid: false, message: `Target ${targetId} not found` };
            }

            if (requireAlive && !target.isAlive) {
                return { valid: false, message: `Target ${target.name} is dead` };
            }
        }

        return { valid: true };
    }

    /**
     * Validate that actor and targets are different
     */
    protected validateNotSelf(canTargetSelf: boolean = false): { valid: boolean; message?: string } {
        if (!canTargetSelf && this.targetIds.includes(this.actorId)) {
            return { valid: false, message: 'Cannot target self' };
        }

        return { valid: true };
    }

    /**
     * Validate target count
     */
    protected validateTargetCount(expected: number): { valid: boolean; message?: string } {
        if (this.targetIds.length !== expected) {
            return {
                valid: false,
                message: `Expected ${expected} target(s), got ${this.targetIds.length}`
            };
        }

        return { valid: true };
    }

    /**
     * Get actor player
     */
    protected getActor(state: GameState) {
        return state.getPlayer(this.actorId);
    }

    /**
     * Get target player (first target)
     */
    protected getTarget(state: GameState) {
        return this.targetIds.length > 0 ? state.getPlayer(this.targetIds[0]) : undefined;
    }

    /**
     * Get all target players
     */
    protected getTargets(state: GameState) {
        return this.targetIds
            .map(id => state.getPlayer(id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined);
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Create failure result with validation message
     */
    protected failureResult(state: GameState, message: string): CommandResult {
        return CommandResult.failure(state, message, {
            commandId: this.id,
            actorId: this.actorId,
            targetIds: this.targetIds
        });
    }

    /**
     * Create success result
     */
    protected successResult(
        newState: GameState,
        message: string,
        metadata: Record<string, any> = {}
    ): CommandResult {
        return CommandResult.success(newState, message, {
            commandId: this.id,
            actorId: this.actorId,
            targetIds: this.targetIds,
            ...metadata
        });
    }

    /**
     * Convert to JSON for serialization
     */
    toJSON(): CommandJSON {
        return {
            id: this.id,
            timestamp: this.timestamp,
            actorId: this.actorId,
            actorRoleId: this.actorRoleId,
            targetIds: this.targetIds,
            description: this.description
        };
    }
}

// ============================================
// Supporting Types
// ============================================

export interface CommandJSON {
    id: string;
    timestamp: number;
    actorId: string;
    actorRoleId: string;
    targetIds: string[];
    description: string;
}
