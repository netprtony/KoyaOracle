/**
 * Tests for LoversLinkedFateHandler
 */

import { 
    hasLoverPartner,
    getLoverPartner,
    shouldTriggerLoverDeath,
    processLinkedFateDeath,
    processDeathsWithLinkedFate,
    checkLoversWinCondition
} from '../LoversLinkedFateHandler';
import { GameState } from '../../entities/GameState';
import { Player } from '../../entities/Player';
import { PlayerStatus } from '../../entities/PlayerStatus';

describe('LoversLinkedFateHandler', () => {
    let gameState: GameState;
    let lover1: Player;
    let lover2: Player;
    let werewolf: Player;
    let villager: Player;

    beforeEach(() => {
        // Create lovers
        lover1 = new Player('lover1', 'Lover 1', 'dan_thuong', 'villager', PlayerStatus.ALIVE | PlayerStatus.IS_LOVER, 1)
            .withMetadata({ loverPartnerId: 'lover2' });
        lover2 = new Player('lover2', 'Lover 2', 'dan_thuong', 'villager', PlayerStatus.ALIVE | PlayerStatus.IS_LOVER, 2)
            .withMetadata({ loverPartnerId: 'lover1' });
        
        werewolf = new Player('werewolf1', 'Werewolf', 'soi', 'werewolf', PlayerStatus.ALIVE, 3);
        villager = new Player('villager1', 'Villager', 'dan_thuong', 'villager', PlayerStatus.ALIVE, 4);
        
        const playersMap = new Map<string, Player>();
        playersMap.set(lover1.id, lover1);
        playersMap.set(lover2.id, lover2);
        playersMap.set(werewolf.id, werewolf);
        playersMap.set(villager.id, villager);
        
        gameState = new GameState(playersMap, 1, 'night', {
            lovers: {
                player1Id: lover1.id,
                player2Id: lover2.id,
                sameTeam: true
            }
        });
    });

    describe('hasLoverPartner', () => {
        it('should return true for player with lover', () => {
            expect(hasLoverPartner(lover1)).toBe(true);
        });

        it('should return false for player without lover', () => {
            expect(hasLoverPartner(villager)).toBe(false);
        });
    });

    describe('getLoverPartner', () => {
        it('should return partner for lover', () => {
            const partner = getLoverPartner(lover1, gameState);
            expect(partner).toBeDefined();
            expect(partner?.id).toBe(lover2.id);
        });

        it('should return undefined for non-lover', () => {
            const partner = getLoverPartner(villager, gameState);
            expect(partner).toBeUndefined();
        });
    });

    describe('shouldTriggerLoverDeath', () => {
        it('should return true if partner is alive', () => {
            expect(shouldTriggerLoverDeath(lover1, gameState)).toBe(true);
        });

        it('should return false if partner is dead', () => {
            const deadLover2 = lover2.kill('werewolf');
            gameState = gameState.updatePlayer(lover2.id, () => deadLover2);
            
            expect(shouldTriggerLoverDeath(lover1, gameState)).toBe(false);
        });

        it('should return false for non-lover', () => {
            expect(shouldTriggerLoverDeath(villager, gameState)).toBe(false);
        });
    });

    describe('processLinkedFateDeath', () => {
        it('should kill partner when lover dies', () => {
            const deadLover1 = lover1.kill('werewolf');
            gameState = gameState.updatePlayer(lover1.id, () => deadLover1);
            
            const result = processLinkedFateDeath(deadLover1, gameState);
            
            expect(result.partnerDied).toBe(true);
            expect(result.partnerId).toBe(lover2.id);
            
            const killedPartner = result.state.getPlayer(lover2.id);
            expect(killedPartner?.isAlive).toBe(false);
        });

        it('should not kill partner if already dead', () => {
            // Both lovers already dead
            const deadLover1 = lover1.kill('werewolf');
            const deadLover2 = lover2.kill('werewolf');
            gameState = gameState.updatePlayer(lover1.id, () => deadLover1);
            gameState = gameState.updatePlayer(lover2.id, () => deadLover2);
            
            const result = processLinkedFateDeath(deadLover1, gameState);
            
            expect(result.partnerDied).toBe(false);
        });
    });

    describe('processDeathsWithLinkedFate', () => {
        it('should process linked fate deaths correctly', () => {
            const deathQueue = [{ playerId: lover1.id, cause: 'werewolf' }];
            
            const result = processDeathsWithLinkedFate(deathQueue, gameState);
            
            // Both lovers should be dead
            const deadLover1 = result.state.getPlayer(lover1.id);
            const deadLover2 = result.state.getPlayer(lover2.id);
            
            expect(deadLover1?.isAlive).toBe(false);
            expect(deadLover2?.isAlive).toBe(false);
            
            // Should have 2 deaths
            expect(result.deaths.length).toBe(2);
        });

        it('should not cause infinite loop when both lovers die same night', () => {
            // Both are attacked
            const deathQueue = [
                { playerId: lover1.id, cause: 'werewolf' },
                { playerId: lover2.id, cause: 'witch_poison' }
            ];
            
            const result = processDeathsWithLinkedFate(deathQueue, gameState);
            
            // Should complete without error
            const deadLover1 = result.state.getPlayer(lover1.id);
            const deadLover2 = result.state.getPlayer(lover2.id);
            
            expect(deadLover1?.isAlive).toBe(false);
            expect(deadLover2?.isAlive).toBe(false);
        });

        it('should generate appropriate messages', () => {
            const deathQueue = [{ playerId: lover1.id, cause: 'werewolf' }];
            
            const result = processDeathsWithLinkedFate(deathQueue, gameState);
            
            expect(result.messages.length).toBeGreaterThan(0);
            expect(result.messages[0]).toContain('💔');
        });
    });

    describe('checkLoversWinCondition', () => {
        it('should return false if lovers are same team', () => {
            // Same team lovers don't have special win
            const result = checkLoversWinCondition(gameState);
            expect(result.isWin).toBe(false);
        });

        describe('different team lovers', () => {
            beforeEach(() => {
                // Create different team lovers
                lover1 = new Player('lover1', 'Lover 1', 'dan_thuong', 'neutral', PlayerStatus.ALIVE | PlayerStatus.IS_LOVER, 1)
                    .withMetadata({ loverPartnerId: 'lover2', originalTeam: 'villager' });
                lover2 = new Player('lover2', 'Lover 2', 'soi', 'neutral', PlayerStatus.ALIVE | PlayerStatus.IS_LOVER, 2)
                    .withMetadata({ loverPartnerId: 'lover1', originalTeam: 'werewolf' });
                
                const playersMap = new Map<string, Player>();
                playersMap.set(lover1.id, lover1);
                playersMap.set(lover2.id, lover2);
                
                gameState = new GameState(playersMap, 3, 'day', {
                    lovers: {
                        player1Id: lover1.id,
                        player2Id: lover2.id,
                        sameTeam: false
                    }
                });
            });

            it('should return true if only lovers remain alive', () => {
                const result = checkLoversWinCondition(gameState);
                
                expect(result.isWin).toBe(true);
                expect(result.loversInfo?.player1Id).toBe(lover1.id);
                expect(result.loversInfo?.player2Id).toBe(lover2.id);
            });

            it('should return false if other players alive', () => {
                const playersMap = new Map(gameState.players);
                playersMap.set(villager.id, villager);
                gameState = new GameState(playersMap, 3, 'day', gameState.metadata);
                
                const result = checkLoversWinCondition(gameState);
                expect(result.isWin).toBe(false);
            });

            it('should return false if one lover is dead', () => {
                const deadLover1 = lover1.kill('werewolf');
                gameState = gameState.updatePlayer(lover1.id, () => deadLover1);
                
                const result = checkLoversWinCondition(gameState);
                expect(result.isWin).toBe(false);
            });
        });
    });
});
