/**
 * GameEngine Integration Tests
 */

import { GameEngine, createGameEngine, resetGameEngine } from '../GameEngine';
import { PlayerInput } from '../PlayerStateManager';

describe('GameEngine Integration', () => {
    beforeEach(() => {
        resetGameEngine();
    });

    const createBasicPlayers = (): PlayerInput[] => [
        { id: 'p1', name: 'Werewolf', roleId: 'soi', team: 'werewolf' },
        { id: 'p2', name: 'Seer', roleId: 'tien_tri', team: 'villager' },
        { id: 'p3', name: 'Guard', roleId: 'bao_ve', team: 'villager' },
        { id: 'p4', name: 'Villager 1', roleId: 'dan_lang', team: 'villager' },
        { id: 'p5', name: 'Villager 2', roleId: 'dan_lang', team: 'villager' },
    ];

    describe('Game Initialization', () => {
        it('should initialize game with correct state', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            const state = engine.getGameState();

            expect(state.nightNumber).toBe(0);
            expect(state.phase).toBe('night');
            expect(state.alivePlayers.length).toBe(5);
            expect(state.deadPlayers.length).toBe(0);
        });

        it('should get player state', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            const playerState = engine.getPlayerState('p1');

            expect(playerState).toBeDefined();
            expect(playerState?.roleId).toBe('soi');
            expect(playerState?.isAlive).toBe(true);
        });
    });

    describe('Night Phase', () => {
        it('should start night phase correctly', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            const { nightNumber, effects } = engine.startNightPhase();

            expect(nightNumber).toBe(1);
            expect(engine.getCurrentPhase()).toBe('night');
        });

        it('should accept and resolve night actions', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();

            // Guard protects Seer
            engine.submitNightAction({
                playerId: 'p3',
                roleId: 'bao_ve',
                actionType: 'protect',
                targetIds: ['p2'],
                timestamp: Date.now(),
            });

            // Werewolf attacks Seer
            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p2'],
                timestamp: Date.now(),
            });

            const result = engine.resolveNight();

            // Seer should be saved
            expect(result.savedPlayers).toContain('p2');
            expect(result.deaths).not.toContain('p2');
        });

        it('should kill unprotected target', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();

            // Werewolf attacks Villager 1 (unprotected)
            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p4'],
                timestamp: Date.now(),
            });

            const result = engine.resolveNight();

            expect(result.deaths).toContain('p4');
            expect(engine.getPlayerState('p4')?.isAlive).toBe(false);
        });

        it('should provide investigation results', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();

            // Seer investigates Werewolf
            engine.submitNightAction({
                playerId: 'p2',
                roleId: 'tien_tri',
                actionType: 'investigate',
                targetIds: ['p1'],
                timestamp: Date.now(),
            });

            const result = engine.resolveNight();

            // Check investigation result
            const investigationKey = 'p2:p1';
            expect(result.investigationResults.has(investigationKey)).toBe(true);
            expect(result.investigationResults.get(investigationKey)).toBe('werewolf');
        });
    });

    describe('Day Phase', () => {
        it('should execute player correctly', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();
            engine.resolveNight();
            engine.startDayPhase();

            const result = engine.executePlayer('p1');

            expect(result.executedPlayer).toBe('p1');
            expect(engine.getPlayerState('p1')?.isAlive).toBe(false);
        });

        it('should detect win after execution', () => {
            // Create minimal game where executing werewolf wins
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Werewolf', roleId: 'soi', team: 'werewolf' },
                { id: 'p2', name: 'Villager', roleId: 'dan_lang', team: 'villager' },
            ];

            const engine = createGameEngine({ players });
            engine.startNightPhase();
            engine.resolveNight();
            engine.startDayPhase();

            const result = engine.executePlayer('p1');

            expect(result.winResult?.hasWinner).toBe(true);
            expect(result.winResult?.winner).toBe('villager');
        });
    });

    describe('Full Game Flow', () => {
        it('should play through multiple nights', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });

            // Night 1
            engine.startNightPhase();
            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p4'],
                timestamp: Date.now(),
            });
            engine.resolveNight();

            // Day 1
            engine.startDayPhase();

            // Night 2
            engine.startNightPhase();
            expect(engine.getNightNumber()).toBe(2);

            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p5'],
                timestamp: Date.now(),
            });
            engine.resolveNight();

            expect(engine.getAlivePlayers().length).toBe(3);
        });

        it('should handle lovers death cascade', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Werewolf', roleId: 'soi', team: 'werewolf' },
                { id: 'p2', name: 'Villager 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p3', name: 'Villager 2', roleId: 'dan_lang', team: 'villager' },
                { id: 'p4', name: 'Villager 3', roleId: 'dan_lang', team: 'villager' },
            ];

            const engine = createGameEngine({ players });

            // Create lovers
            engine.createLovers('p2', 'p3');

            // Night 1 - kill one lover
            engine.startNightPhase();
            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p2'],
                timestamp: Date.now(),
            });

            const result = engine.resolveNight();

            // Both lovers should be dead
            expect(result.deaths).toContain('p2');
            expect(engine.getPlayerState('p3')?.isAlive).toBe(false);
        });
    });

    describe('Win Conditions', () => {
        it('should detect werewolf team win', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Werewolf', roleId: 'soi', team: 'werewolf' },
                { id: 'p2', name: 'Villager 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p3', name: 'Villager 2', roleId: 'dan_lang', team: 'villager' },
            ];

            const engine = createGameEngine({ players });

            // Night 1 - kill one villager
            engine.startNightPhase();
            engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p2'],
                timestamp: Date.now(),
            });
            engine.resolveNight();

            // Now 1 werewolf vs 1 villager - werewolf wins
            const winResult = engine.checkWinConditions();
            expect(winResult.hasWinner).toBe(true);
            expect(winResult.winner).toBe('werewolf');
        });

        it('should detect villager team win', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Werewolf', roleId: 'soi', team: 'werewolf' },
                { id: 'p2', name: 'Villager 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p3', name: 'Villager 2', roleId: 'dan_lang', team: 'villager' },
            ];

            const engine = createGameEngine({ players });

            engine.startNightPhase();
            engine.resolveNight();
            engine.startDayPhase();

            // Execute werewolf
            engine.executePlayer('p1');

            const winResult = engine.checkWinConditions();
            expect(winResult.hasWinner).toBe(true);
            expect(winResult.winner).toBe('villager');
        });
    });

    describe('Action Validation', () => {
        it('should reject actions in wrong phase', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();
            engine.resolveNight();
            engine.startDayPhase();

            const result = engine.submitNightAction({
                playerId: 'p1',
                roleId: 'soi',
                actionType: 'kill',
                targetIds: ['p2'],
                timestamp: Date.now(),
            });

            expect(result.success).toBe(false);
        });

        it('should validate action restrictions', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });
            engine.startNightPhase();

            const canPerform = engine.canPerformAction('p3', 'protect', ['p2']);
            expect(canPerform.canPerform).toBe(true);
        });
    });

    describe('Special Abilities', () => {
        it('should handle mayor vote weight', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });

            engine.assignMayor('p2');
            const state = engine.getPlayerState('p2');

            expect(state?.voteWeight).toBe(2);
        });

        it('should transfer mayor role', () => {
            const engine = createGameEngine({ players: createBasicPlayers() });

            engine.assignMayor('p2');
            engine.transferMayor('p2', 'p3');

            expect(engine.getPlayerState('p2')?.voteWeight).toBe(1);
            expect(engine.getPlayerState('p3')?.voteWeight).toBe(2);
        });
    });
});
