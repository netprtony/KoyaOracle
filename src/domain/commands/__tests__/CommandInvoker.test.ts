/**
 * CommandInvoker Unit Tests
 */

import { CommandInvoker } from '../CommandInvoker';
import { ICommand } from '../ICommand';
import { GameState } from '../../entities/GameState';
import { Player } from '../../entities/Player';
import { PlayerStatus } from '../../entities/PlayerStatus';
import { CommandResult } from '../CommandResult';

// Mock command for testing
class MockCommand implements ICommand {
    public executed = false;
    public undone = false;

    constructor(
        public readonly id: string,
        public readonly actorId: string,
        public readonly actorRoleId: string,
        public readonly timestamp: number = Date.now(),
        public readonly description: string = 'Mock command',
        private shouldFail: boolean = false
    ) { }

    canExecute(state: GameState): boolean {
        return !this.shouldFail;
    }

    execute(state: GameState): CommandResult {
        if (this.shouldFail) {
            return CommandResult.failure(state, 'Mock command failed');
        }

        this.executed = true;
        // Modify state slightly for testing
        const player = state.getPlayer(this.actorId);
        if (player) {
            const updated = player.addStatus(PlayerStatus.PROTECTED);
            const newState = state.updatePlayer(this.actorId, () => updated);
            return CommandResult.success(newState, 'Mock command executed');
        }
        return CommandResult.failure(state, 'Player not found');
    }

    undo(state: GameState): CommandResult {
        this.undone = true;
        const player = state.getPlayer(this.actorId);
        if (player) {
            const updated = player.removeStatus(PlayerStatus.PROTECTED);
            const newState = state.updatePlayer(this.actorId, () => updated);
            return CommandResult.success(newState, 'Mock command undone');
        }
        return CommandResult.failure(state, 'Player not found');
    }

    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,
            actorId: this.actorId,
            actorRoleId: this.actorRoleId,
            targetIds: [],
            description: this.description
        };
    }
}

describe('CommandInvoker', () => {
    let invoker: CommandInvoker;
    let gameState: GameState;
    let player: Player;

    beforeEach(() => {
        player = new Player('p1', 'Player1', 'dan_lang', 'villager', PlayerStatus.ALIVE, 0);
        const players = new Map<string, Player>();
        players.set(player.id, player);
        gameState = new GameState(players, 1, 'night');

        invoker = new CommandInvoker(gameState);
    });

    describe('execute', () => {
        it('should execute valid command', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');
            const result = invoker.execute(command, gameState);

            expect(result.isSuccess).toBe(true);
            expect(command.executed).toBe(true);
        });

        it('should add command to history', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');
            invoker.execute(command, gameState);

            expect(invoker.historySize).toBe(1);
            expect(invoker.getCurrentCommand()).toBe(command);
        });

        it('should not execute invalid command', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang', Date.now(), 'Mock', true);
            const result = invoker.execute(command, gameState);

            expect(result.isFailure).toBe(true);
            expect(invoker.historySize).toBe(0);
        });

        it('should clear redo history on new command', () => {
            const cmd1 = new MockCommand('cmd1', player.id, 'dan_lang');
            const cmd2 = new MockCommand('cmd2', player.id, 'dan_lang');
            const cmd3 = new MockCommand('cmd3', player.id, 'dan_lang');

            // Execute 2 commands
            let state = gameState;
            let result = invoker.execute(cmd1, state);
            state = result.newState;
            result = invoker.execute(cmd2, state);
            state = result.newState;

            // Undo one
            result = invoker.undo(state);
            state = result.newState;

            expect(invoker.canRedo()).toBe(true);

            // Execute new command (should clear redo)
            result = invoker.execute(cmd3, state);
            expect(invoker.canRedo()).toBe(false);
            expect(invoker.historySize).toBe(2);
        });
    });

    describe('undo', () => {
        it('should undo last command', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');

            let result = invoker.execute(command, gameState);
            const stateAfterExecute = result.newState;

            result = invoker.undo(stateAfterExecute);

            expect(result.isSuccess).toBe(true);
            expect(command.undone).toBe(true);
        });

        it('should fail when no commands to undo', () => {
            const result = invoker.undo(gameState);

            expect(result.isFailure).toBe(true);
            expect(result.message).toContain('Nothing to undo');
        });

        it('should decrement current index', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');

            let result = invoker.execute(command, gameState);
            expect(invoker.historySize).toBe(1);

            result = invoker.undo(result.newState);
            expect(invoker.historySize).toBe(0);
        });
    });

    describe('redo', () => {
        it('should redo undone command', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');

            // Execute, then undo
            let result = invoker.execute(command, gameState);
            let state = result.newState;
            result = invoker.undo(state);
            state = result.newState;

            // Reset executed flag
            command.executed = false;

            // Redo
            result = invoker.redo(state);

            expect(result.isSuccess).toBe(true);
            expect(command.executed).toBe(true);
        });

        it('should fail when no commands to redo', () => {
            const result = invoker.redo(gameState);

            expect(result.isFailure).toBe(true);
            expect(result.message).toContain('Nothing to redo');
        });
    });

    describe('canUndo and canRedo', () => {
        it('should return correct undo/redo availability', () => {
            expect(invoker.canUndo()).toBe(false);
            expect(invoker.canRedo()).toBe(false);

            const command = new MockCommand('cmd1', player.id, 'dan_lang');
            let result = invoker.execute(command, gameState);

            expect(invoker.canUndo()).toBe(true);
            expect(invoker.canRedo()).toBe(false);

            result = invoker.undo(result.newState);

            expect(invoker.canUndo()).toBe(false);
            expect(invoker.canRedo()).toBe(true);
        });
    });

    describe('history management', () => {
        it('should track multiple commands', () => {
            const cmd1 = new MockCommand('cmd1', player.id, 'dan_lang');
            const cmd2 = new MockCommand('cmd2', player.id, 'dan_lang');
            const cmd3 = new MockCommand('cmd3', player.id, 'dan_lang');

            let state = gameState;
            let result = invoker.execute(cmd1, state);
            state = result.newState;
            result = invoker.execute(cmd2, state);
            state = result.newState;
            result = invoker.execute(cmd3, state);

            expect(invoker.historySize).toBe(3);
            expect(invoker.getHistory()).toHaveLength(3);
        });

        it('should clear all history', () => {
            const command = new MockCommand('cmd1', player.id, 'dan_lang');
            invoker.execute(command, gameState);

            invoker.clear();

            expect(invoker.historySize).toBe(0);
            expect(invoker.canUndo()).toBe(false);
        });
    });
});
