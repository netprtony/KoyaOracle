/**
 * WerewolfKillCommand Unit Tests
 */

import { WerewolfKillCommand } from '../WerewolfKillCommand';
import { GameState } from '../../../entities/GameState';
import { Player } from '../../../entities/Player';
import { PlayerStatus } from '../../../entities/PlayerStatus';

describe('WerewolfKillCommand', () => {
    let gameState: GameState;
    let werewolf: Player;
    let villager: Player;

    beforeEach(() => {
        // Create test players
        werewolf = new Player('w1', 'Werewolf', 'soi', 'werewolf', PlayerStatus.ALIVE, 0);
        villager = new Player('v1', 'Villager', 'dan_lang', 'villager', PlayerStatus.ALIVE, 1);

        // Create game state
        const players = new Map<string, Player>();
        players.set(werewolf.id, werewolf);
        players.set(villager.id, villager);
        gameState = new GameState(players, 1, 'night');
    });

    describe('canExecute', () => {
        it('should allow werewolf to attack villager', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            expect(command.canExecute(gameState)).toBe(true);
        });

        it('should not allow werewolf to attack another werewolf', () => {
            const werewolf2 = new Player('w2', 'Werewolf2', 'soi', 'werewolf', PlayerStatus.ALIVE, 2);
            const newState = gameState.addPlayer(werewolf2);

            const command = new WerewolfKillCommand(werewolf.id, werewolf2.id);
            expect(command.canExecute(newState)).toBe(false);
        });

        it('should not allow dead werewolf to attack', () => {
            const deadWerewolf = werewolf.removeStatus(PlayerStatus.ALIVE);
            const newState = gameState.updatePlayer(werewolf.id, () => deadWerewolf);

            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            expect(command.canExecute(newState)).toBe(false);
        });

        it('should not allow attacking dead player', () => {
            const deadVillager = villager.removeStatus(PlayerStatus.ALIVE);
            const newState = gameState.updatePlayer(villager.id, () => deadVillager);

            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            expect(command.canExecute(newState)).toBe(false);
        });
    });

    describe('execute', () => {
        it('should mark target as BITTEN', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            const result = command.execute(gameState);

            expect(result.isSuccess).toBe(true);

            const updatedVillager = result.newState.getPlayer(villager.id);
            expect(updatedVillager?.isBitten).toBe(true);
            expect(updatedVillager?.isAlive).toBe(true); // Still alive until resolution
        });

        it('should preserve other player statuses', () => {
            // Give villager BLESSED status
            const blessedVillager = villager.addStatus(PlayerStatus.BLESSED);
            const newState = gameState.updatePlayer(villager.id, () => blessedVillager);

            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            const result = command.execute(newState);

            const updatedVillager = result.newState.getPlayer(villager.id);
            expect(updatedVillager?.isBitten).toBe(true);
            expect(updatedVillager?.isBlessed).toBe(true);
        });

        it('should include metadata in result', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            const result = command.execute(gameState);

            expect(result.metadata.targetId).toBe(villager.id);
            expect(result.metadata.targetName).toBe(villager.name);
            expect(result.metadata.previousMask).toBeDefined();
            expect(result.metadata.newMask).toBeDefined();
        });
    });

    describe('undo', () => {
        it('should restore previous status mask', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);

            // Execute command
            const executeResult = command.execute(gameState);
            expect(executeResult.newState.getPlayer(villager.id)?.isBitten).toBe(true);

            // Undo command
            const undoResult = command.undo(executeResult.newState);
            expect(undoResult.isSuccess).toBe(true);

            const restoredVillager = undoResult.newState.getPlayer(villager.id);
            expect(restoredVillager?.isBitten).toBe(false);
            expect(restoredVillager?.isAlive).toBe(true);
        });

        it('should fail if executed before undo', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            const result = command.undo(gameState);

            expect(result.isFailure).toBe(true);
            expect(result.message).toContain('no previous state');
        });
    });

    describe('description', () => {
        it('should provide human-readable description', () => {
            const command = new WerewolfKillCommand(werewolf.id, villager.id);
            expect(command.description).toContain('Werewolf');
            expect(command.description).toContain('attacks');
        });
    });
});
