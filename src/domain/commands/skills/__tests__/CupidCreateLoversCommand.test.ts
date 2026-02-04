/**
 * Tests for CupidCreateLoversCommand
 */

import { CupidCreateLoversCommand } from '../CupidCreateLoversCommand';
import { GameState } from '../../../entities/GameState';
import { Player } from '../../../entities/Player';
import { PlayerStatus } from '../../../entities/PlayerStatus';

describe('CupidCreateLoversCommand', () => {
    let gameState: GameState;
    let cupid: Player;
    let villager1: Player;
    let villager2: Player;
    let werewolf: Player;

    beforeEach(() => {
        cupid = new Player('cupid1', 'Cupid Player', 'than_tinh_yeu', 'villager', PlayerStatus.ALIVE, 1);
        villager1 = new Player('villager1', 'Villager 1', 'dan_thuong', 'villager', PlayerStatus.ALIVE, 2);
        villager2 = new Player('villager2', 'Villager 2', 'dan_thuong', 'villager', PlayerStatus.ALIVE, 3);
        werewolf = new Player('werewolf1', 'Werewolf 1', 'soi', 'werewolf', PlayerStatus.ALIVE, 4);
        
        const playersMap = new Map<string, Player>();
        playersMap.set(cupid.id, cupid);
        playersMap.set(villager1.id, villager1);
        playersMap.set(villager2.id, villager2);
        playersMap.set(werewolf.id, werewolf);
        
        // Night 1 is required for Cupid
        gameState = new GameState(playersMap, 1, 'night');
    });

    describe('canExecute', () => {
        it('should return true for valid lovers creation on night 1', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            expect(command.canExecute(gameState)).toBe(true);
        });

        it('should return false if not night 1', () => {
            gameState = new GameState(gameState.players, 2, 'night');
            
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if cupid is dead', () => {
            const deadCupid = cupid.kill('werewolf');
            gameState = gameState.updatePlayer(cupid.id, () => deadCupid);
            
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if target is dead', () => {
            const deadVillager = villager1.kill('werewolf');
            gameState = gameState.updatePlayer(villager1.id, () => deadVillager);
            
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if same target selected twice', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager1.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if cupid selects themselves', () => {
            const command = new CupidCreateLoversCommand(cupid.id, cupid.id, villager1.id);
            expect(command.canExecute(gameState)).toBe(false);
        });

        it('should return false if lovers already created', () => {
            gameState = gameState.withMetadata({ loversCreated: true });
            
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            expect(command.canExecute(gameState)).toBe(false);
        });
    });

    describe('execute - same team lovers', () => {
        it('should create lovers with IS_LOVER status', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(true);
            
            const lover1 = result.newState.getPlayer(villager1.id);
            const lover2 = result.newState.getPlayer(villager2.id);
            
            expect(lover1?.isLover).toBe(true);
            expect(lover2?.isLover).toBe(true);
        });

        it('should set loverPartnerId on both players', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            const result = command.execute(gameState);
            
            const lover1 = result.newState.getPlayer(villager1.id);
            const lover2 = result.newState.getPlayer(villager2.id);
            
            expect(lover1?.loverPartnerId).toBe(villager2.id);
            expect(lover2?.loverPartnerId).toBe(villager1.id);
        });

        it('should keep original team for same team lovers', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            const result = command.execute(gameState);
            
            const lover1 = result.newState.getPlayer(villager1.id);
            const lover2 = result.newState.getPlayer(villager2.id);
            
            expect(lover1?.team).toBe('villager');
            expect(lover2?.team).toBe('villager');
        });

        it('should mark loversCreated in metadata', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            const result = command.execute(gameState);
            
            expect(result.newState.metadata.loversCreated).toBe(true);
            expect(result.newState.metadata.lovers).toBeDefined();
            expect(result.newState.metadata.lovers.sameTeam).toBe(true);
        });
    });

    describe('execute - different team lovers', () => {
        it('should change team to neutral for different team lovers', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, werewolf.id);
            const result = command.execute(gameState);
            
            expect(result.isSuccess).toBe(true);
            
            const lover1 = result.newState.getPlayer(villager1.id);
            const lover2 = result.newState.getPlayer(werewolf.id);
            
            expect(lover1?.team).toBe('neutral');
            expect(lover2?.team).toBe('neutral');
        });

        it('should store original team in metadata', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, werewolf.id);
            const result = command.execute(gameState);
            
            const lover1 = result.newState.getPlayer(villager1.id);
            const lover2 = result.newState.getPlayer(werewolf.id);
            
            expect(lover1?.metadata.originalTeam).toBe('villager');
            expect(lover2?.metadata.originalTeam).toBe('werewolf');
        });

        it('should mark sameTeam as false in metadata', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, werewolf.id);
            const result = command.execute(gameState);
            
            expect(result.newState.metadata.lovers.sameTeam).toBe(false);
        });
    });

    describe('undo', () => {
        it('should restore previous state on undo', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, villager2.id);
            const executeResult = command.execute(gameState);
            
            expect(executeResult.isSuccess).toBe(true);
            
            const undoResult = command.undo(executeResult.newState);
            
            expect(undoResult.isSuccess).toBe(true);
            
            const restoredVillager1 = undoResult.newState.getPlayer(villager1.id);
            const restoredVillager2 = undoResult.newState.getPlayer(villager2.id);
            
            expect(restoredVillager1?.isLover).toBe(false);
            expect(restoredVillager2?.isLover).toBe(false);
            expect(restoredVillager1?.loverPartnerId).toBeUndefined();
            expect(restoredVillager2?.loverPartnerId).toBeUndefined();
        });

        it('should restore team on undo for different team lovers', () => {
            const command = new CupidCreateLoversCommand(cupid.id, villager1.id, werewolf.id);
            const executeResult = command.execute(gameState);
            const undoResult = command.undo(executeResult.newState);
            
            const restoredVillager = undoResult.newState.getPlayer(villager1.id);
            const restoredWerewolf = undoResult.newState.getPlayer(werewolf.id);
            
            expect(restoredVillager?.team).toBe('villager');
            expect(restoredWerewolf?.team).toBe('werewolf');
        });
    });
});
