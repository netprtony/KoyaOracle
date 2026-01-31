/**
 * CommandResult - Standardized result type for command execution
 * 
 * Provides consistent return values for all commands with success/failure
 * status, updated state, and optional metadata.
 */

import { GameState } from '../entities/GameState';

export class CommandResult {
    constructor(
        public readonly success: boolean,
        public readonly newState: GameState,
        public readonly message: string = '',
        public readonly metadata: Record<string, any> = {}
    ) { }

    /**
     * Create a successful result
     */
    static success(
        newState: GameState,
        message: string = '',
        metadata: Record<string, any> = {}
    ): CommandResult {
        return new CommandResult(true, newState, message, metadata);
    }

    /**
     * Create a failure result (state unchanged)
     */
    static failure(
        currentState: GameState,
        message: string,
        metadata: Record<string, any> = {}
    ): CommandResult {
        return new CommandResult(false, currentState, message, metadata);
    }

    /**
     * Check if result is successful
     */
    get isSuccess(): boolean {
        return this.success;
    }

    /**
     * Check if result is failure
     */
    get isFailure(): boolean {
        return !this.success;
    }

    /**
     * Get metadata value
     */
    getMeta<T = any>(key: string): T | undefined {
        return this.metadata[key] as T;
    }

    /**
     * Add metadata to result
     */
    withMeta(key: string, value: any): CommandResult {
        return new CommandResult(
            this.success,
            this.newState,
            this.message,
            { ...this.metadata, [key]: value }
        );
    }
}
