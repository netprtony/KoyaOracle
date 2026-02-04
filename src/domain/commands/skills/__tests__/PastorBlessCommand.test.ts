/**
 * Tests for PastorBlessCommand
 */

import { PastorBlessCommand } from '../PastorBlessCommand';
import { GameState } from '../../../entities/GameState';
import { Player } from '../../../entities/Player';
import { PlayerStatus } from '../../../entities/PlayerStatus';

describe('PastorBlessCommand', () => {
    let gameState: GameState;
    let pastor: Player;
    let target: Player;

    beforeEach(() => {
        pastor = new Player('pastor1', 'Pastor Player', 'muc_su', 'villager', PlayerStatus.ALIVE, 1);
        target = new Player('villager1', 'Villager Player', 'dan_thuong', 'villager', PlayerStatus.ALIVE, 2);
        
        const playersMap = new Map<string, Player>();
        playersMap.set(pastor.id, pastor);
        playersMap.set(target.id, target);
        
        gameState = new GameState(playersMap, 1, 'night');
    });

    describe('canExecute', () => {
        it('should return true for valid bless action', () => {
            const command = new PastorBlessCommand(pastor.id, target.id);
            expect(command.canExecute(gameState)).toBe(true);
        });

        it('should return false if pastor is dead', () => {
            const deadPastor = pastor.kill('werewolf');
            gameState = gameState.updatePlayer(pastor.id, () => deadPastor);
            
            const command = new PastorBlessCommand(pastor.id, target.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if target is dead', () => {
            const deadTarget = target.kill('werewolf');
            gameState = gameState.updatePlayer(target.id, () => deadTarget);
            
            const command = new PastorBlessCommand(pastor.id, target.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if bless already used', () => {
            const usedPastor = pastor.addStatus(PlayerStatus.USED_BLESS);
            gameState = gameState.updatePlayer(pastor.id, () => usedPastor);
            
            const command = new PastorBlessCommand(pastor.id, target.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should allow pastor to bless themselves', () => {
            const command = new PastorBlessCommand(pastor.id, pastor.id);
            expect(command.canExecute(gameState)).toBe(true);
        });
    });

    describe('execute', () => {
        it('should add BLESSED status to target', () => {
            const command = new PastorBlessCommand(pastor.id, target.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(true);
            
            const blessedTarget = result.newState.getPlayer(target.id);
            expect(blessedTarget?.isBlessed).toBe(true);
        });

        it('should mark USED_BLESS on pastor', () => {
            const command = new PastorBlessCommand(pastor.id, target.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(true);
            
            const updatedPastor = result.newState.getPlayer(pastor.id);
            expect(updatedPastor?.hasStatus(PlayerStatus.USED_BLESS)).toBe(true);
        });

        it('should allow self-blessing', () => {
            const command = new PastorBlessCommand(pastor.id, pastor.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(true);
            
            const blessedPastor = result.newState.getPlayer(pastor.id);
            expect(blessedPastor?.isBlessed).toBe(true);
            expect(blessedPastor?.hasStatus(PlayerStatus.USED_BLESS)).toBe(true);
        });

        it('should fail if bless already used', () => {
            const usedPastor = pastor.addStatus(PlayerStatus.USED_BLESS);
            gameState = gameState.updatePlayer(pastor.id, () => usedPastor);
            
            const command = new PastorBlessCommand(pastor.id, target.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(false);
            expect(result.message).toContain('sử dụng');
        });
    });

    describe('undo', () => {
        it('should restore previous state on undo', () => {
            const command = new PastorBlessCommand(pastor.id, target.id);
            const executeResult = command.execute(gameState);
            
            expect(executeResult.isSuccess).toBe(true);
            
            const undoResult = command.undo(executeResult.newState);
            
            expect(undoResult.isSuccess).toBe(true);
            
            const restoredTarget = undoResult.newState.getPlayer(target.id);
            const restoredPastor = undoResult.newState.getPlayer(pastor.id);
            
            expect(restoredTarget?.isBlessed).toBe(false);
            expect(restoredPastor?.hasStatus(PlayerStatus.USED_BLESS)).toBe(false);
        });
    });

    describe('blessing protection', () => {
        it('blessed player should not die from werewolf attack', () => {
            // Execute bless
            const blessCommand = new PastorBlessCommand(pastor.id, target.id);
            const blessResult = blessCommand.execute(gameState);
            
            expect(blessResult.isSuccess).toBe(true);
            
            // Add BITTEN status (werewolf attack)
            const bittenTarget = blessResult.newState.getPlayer(target.id)!.addStatus(PlayerStatus.BITTEN);
            const stateWithBitten = blessResult.newState.updatePlayer(target.id, () => bittenTarget);
            
            const finalTarget = stateWithBitten.getPlayer(target.id);
            
            // Check death logic - blessed should prevent death
            expect(finalTarget?.isBitten).toBe(true);
            expect(finalTarget?.isBlessed).toBe(true);
            expect(finalTarget?.shouldDieFromNight).toBe(false);
        });
    });
});
