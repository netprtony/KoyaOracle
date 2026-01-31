/**
 * ICommand - Command interface for all game actions
 * 
 * Implements the Command Pattern for encapsulating game actions
 * with undo/redo support.
 */

import { GameState } from '../entities/GameState';
import { CommandResult } from './CommandResult';

export interface ICommand {
    /**
     * Execute the command on the given state
     * @param state - Current game state
     * @returns Result with new state or error
     */
    execute(state: GameState): CommandResult;

    /**
     * Undo the command (reverse the changes)
     * @param state - Current game state
     * @returns Result with reverted state
     */
    undo(state: GameState): CommandResult;

    /**
     * Check if command can be executed in current state
     * @param state - Current game state
     * @returns true if command can execute
     */
    canExecute(state: GameState): boolean;

    /**
     * Human-readable description of the command
     */
    readonly description: string;

    /**
     * Unique identifier for this command instance
     */
    readonly id: string;

    /**
     * Timestamp when command was created
     */
    readonly timestamp: number;

    /**
     * ID of the player performing the action
     */
    readonly actorId: string;

    /**
     * Role ID of the actor
     */
    readonly actorRoleId: string;

    /**
     * Serialize command to JSON
     */
    toJSON(): any;
}
