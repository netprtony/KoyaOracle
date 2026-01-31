/**
 * CommandInvoker - Manages command execution and history
 * 
 * Provides undo/redo functionality by maintaining a command history stack.
 * Supports command execution with automatic state tracking.
 */

import { ICommand } from './ICommand';
import { GameState } from '../entities/GameState';
import { CommandResult } from './CommandResult';

export class CommandInvoker {
    private history: ICommand[] = [];
    private currentIndex: number = -1;
    private stateHistory: GameState[] = [];

    constructor(initialState?: GameState) {
        if (initialState) {
            this.stateHistory.push(initialState);
        }
    }

    // ============================================
    // Command Execution
    // ============================================

    /**
     * Execute a command and add it to history
     * @param command - Command to execute
     * @param currentState - Current game state
     * @returns Result of command execution
     */
    execute(command: ICommand, currentState: GameState): CommandResult {
        // Validate command can execute
        if (!command.canExecute(currentState)) {
            return CommandResult.failure(
                currentState,
                `Command cannot execute: ${command.description}`
            );
        }

        // Execute command
        const result = command.execute(currentState);

        if (result.isSuccess) {
            // Clear any redo history when executing new command
            this.history = this.history.slice(0, this.currentIndex + 1);
            this.stateHistory = this.stateHistory.slice(0, this.currentIndex + 2);

            // Add command to history
            this.history.push(command);
            this.stateHistory.push(result.newState);
            this.currentIndex++;
        }

        return result;
    }

    /**
     * Execute multiple commands in sequence
     * @param commands - Commands to execute
     * @param currentState - Current game state
     * @returns Final result after all commands
     */
    executeMany(commands: ICommand[], currentState: GameState): CommandResult {
        let state = currentState;
        let lastResult: CommandResult | null = null;

        for (const command of commands) {
            const result = this.execute(command, state);

            if (result.isFailure) {
                return result; // Stop on first failure
            }

            state = result.newState;
            lastResult = result;
        }

        return lastResult || CommandResult.success(currentState, 'No commands executed');
    }

    // ============================================
    // Undo/Redo Operations
    // ============================================

    /**
     * Undo the last command
     * @param currentState - Current game state
     * @returns Result of undo operation
     */
    undo(currentState: GameState): CommandResult {
        if (!this.canUndo()) {
            return CommandResult.failure(currentState, 'Nothing to undo');
        }

        const command = this.history[this.currentIndex];
        const result = command.undo(currentState);

        if (result.isSuccess) {
            this.currentIndex--;
        }

        return result;
    }

    /**
     * Redo the last undone command
     * @param currentState - Current game state
     * @returns Result of redo operation
     */
    redo(currentState: GameState): CommandResult {
        if (!this.canRedo()) {
            return CommandResult.failure(currentState, 'Nothing to redo');
        }

        this.currentIndex++;
        const command = this.history[this.currentIndex];
        const result = command.execute(currentState);

        if (result.isFailure) {
            this.currentIndex--; // Revert index if redo fails
        }

        return result;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    // ============================================
    // History Management
    // ============================================

    /**
     * Get command history
     */
    getHistory(): readonly ICommand[] {
        return this.history.slice(0, this.currentIndex + 1);
    }

    /**
     * Get full history including undone commands
     */
    getFullHistory(): readonly ICommand[] {
        return [...this.history];
    }

    /**
     * Get current command (last executed)
     */
    getCurrentCommand(): ICommand | undefined {
        return this.currentIndex >= 0 ? this.history[this.currentIndex] : undefined;
    }

    /**
     * Get state at specific history index
     */
    getStateAtIndex(index: number): GameState | undefined {
        return this.stateHistory[index + 1]; // +1 because index 0 is initial state
    }

    /**
     * Get current state from history
     */
    getCurrentState(): GameState | undefined {
        return this.getStateAtIndex(this.currentIndex);
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.history = [];
        this.stateHistory = [];
        this.currentIndex = -1;
    }

    /**
     * Reset to specific point in history
     */
    resetToIndex(index: number): CommandResult {
        if (index < -1 || index >= this.history.length) {
            const currentState = this.getCurrentState() || GameState.empty();
            return CommandResult.failure(currentState, 'Invalid history index');
        }

        this.currentIndex = index;
        const state = this.getStateAtIndex(index) || GameState.empty();

        return CommandResult.success(state, `Reset to history index ${index}`);
    }

    // ============================================
    // Query Methods
    // ============================================

    /**
     * Get history size
     */
    get historySize(): number {
        return this.currentIndex + 1;
    }

    /**
     * Get total history length (including undone commands)
     */
    get totalHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Check if history is empty
     */
    get isEmpty(): boolean {
        return this.history.length === 0;
    }

    /**
     * Get commands by actor
     */
    getCommandsByActor(actorId: string): ICommand[] {
        return this.getHistory().filter(cmd => cmd.actorId === actorId);
    }

    /**
     * Get commands by role
     */
    getCommandsByRole(roleId: string): ICommand[] {
        return this.getHistory().filter(cmd => cmd.actorRoleId === roleId);
    }

    /**
     * Get commands in time range
     */
    getCommandsInRange(startTime: number, endTime: number): ICommand[] {
        return this.getHistory().filter(
            cmd => cmd.timestamp >= startTime && cmd.timestamp <= endTime
        );
    }

    // ============================================
    // Serialization
    // ============================================

    /**
     * Export history to JSON
     */
    toJSON(): CommandInvokerJSON {
        return {
            history: this.history.map(cmd => cmd.toJSON()),
            currentIndex: this.currentIndex,
            stateHistory: this.stateHistory.map(state => state.toJSON())
        };
    }

    /**
     * Import history from JSON
     * Note: This requires command factory to reconstruct command instances
     */
    static fromJSON(
        json: CommandInvokerJSON,
        commandFactory: (cmdJSON: any) => ICommand
    ): CommandInvoker {
        const invoker = new CommandInvoker();

        invoker.history = json.history.map(cmdJSON => commandFactory(cmdJSON));
        invoker.currentIndex = json.currentIndex;
        invoker.stateHistory = json.stateHistory.map(stateJSON =>
            GameState.fromJSON(stateJSON)
        );

        return invoker;
    }
}

// ============================================
// Supporting Types
// ============================================

export interface CommandInvokerJSON {
    history: any[]; // CommandJSON[]
    currentIndex: number;
    stateHistory: any[]; // GameStateJSON[]
}
