/**
 * Night Resolution Integration Tests
 * 
 * Tests night resolution with real scenarios from KichBan.json
 */

import { NightResolver } from '../../../domain/services/NightResolver';
import { CommandInvoker } from '../../../domain/commands/CommandInvoker';
import { GameState as DomainGameState } from '../../../domain/entities/GameState';
import { Player } from '../../../domain/entities/Player';
import { PlayerStatus } from '../../../domain/entities/PlayerStatus';
import { WerewolfKillCommand } from '../../../domain/commands/skills/WerewolfKillCommand';
import { GuardProtectCommand } from '../../../domain/commands/skills/GuardProtectCommand';
import { WitchHealCommand } from '../../../domain/commands/skills/WitchHealCommand';
import { WitchPoisonCommand } from '../../../domain/commands/skills/WitchPoisonCommand';

describe('Night Resolution Integration', () => {
    let invoker: CommandInvoker;
    let resolver: NightResolver;
    let gameState: DomainGameState;

    beforeEach(() => {
        // Create test scenario based on KichBan 1 (6 players)
        const players = new Map<string, Player>();

        players.set('p1', new Player('p1', 'Werewolf', 'soi', 'werewolf', PlayerStatus.ALIVE, 0));
        players.set('p2', new Player('p2', 'Guard', 'bao_ve', 'villager', PlayerStatus.ALIVE, 1));
        players.set('p3', new Player('p3', 'Seer', 'tien_tri', 'villager', PlayerStatus.ALIVE, 2));
        players.set('p4', new Player('p4', 'Witch', 'phu_thuy', 'villager', PlayerStatus.ALIVE, 3));
        players.set('p5', new Player('p5', 'Villager', 'dan_lang', 'villager', PlayerStatus.ALIVE, 4));
        players.set('p6', new Player('p6', 'Villager2', 'dan_lang', 'villager', PlayerStatus.ALIVE, 5));

        gameState = new DomainGameState(players, 1, 'night');
        invoker = new CommandInvoker(gameState);

        // Night order from KichBan.json: bao_ve, soi, phu_thuy, tien_tri
        const nightOrder = ['bao_ve', 'soi', 'phu_thuy', 'tien_tri'];
        resolver = new NightResolver(invoker, nightOrder);
    });

    describe('Werewolf Attack Scenarios', () => {
        it('should kill unprotected player', () => {
            // Werewolf attacks p5
            const killCommand = new WerewolfKillCommand('p1', 'p5');

            const result = resolver.resolve(gameState, [killCommand]);

            expect(result.deaths).toContain('p5');
            expect(result.savedPlayers).toHaveLength(0);

            const deadPlayer = result.state.getPlayer('p5');
            expect(deadPlayer?.isAlive).toBe(false);
        });

        it('should save player protected by guard', () => {
            // Guard protects p5, Werewolf attacks p5
            const protectCommand = new GuardProtectCommand('p2', 'p5');
            const killCommand = new WerewolfKillCommand('p1', 'p5');

            const result = resolver.resolve(gameState, [protectCommand, killCommand]);

            expect(result.deaths).toHaveLength(0);
            expect(result.savedPlayers).toContain('p5');

            const savedPlayer = result.state.getPlayer('p5');
            expect(savedPlayer?.isAlive).toBe(true);
        });

        it('should save player healed by witch', () => {
            // Werewolf attacks p5, Witch heals p5
            const killCommand = new WerewolfKillCommand('p1', 'p5');
            const healCommand = new WitchHealCommand('p4', 'p5');

            const result = resolver.resolve(gameState, [killCommand, healCommand]);

            expect(result.deaths).toHaveLength(0);
            expect(result.savedPlayers).toContain('p5');

            const savedPlayer = result.state.getPlayer('p5');
            expect(savedPlayer?.isAlive).toBe(true);
        });

        it('should handle witch poison', () => {
            // Witch poisons p6
            const poisonCommand = new WitchPoisonCommand('p4', 'p6');

            const result = resolver.resolve(gameState, [poisonCommand]);

            expect(result.deaths).toContain('p6');

            const deadPlayer = result.state.getPlayer('p6');
            expect(deadPlayer?.isAlive).toBe(false);
            expect(deadPlayer?.metadata.killedBy).toBe('witch_poison');
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle multiple deaths in one night', () => {
            // Werewolf attacks p5, Witch poisons p6
            const killCommand = new WerewolfKillCommand('p1', 'p5');
            const poisonCommand = new WitchPoisonCommand('p4', 'p6');

            const result = resolver.resolve(gameState, [killCommand, poisonCommand]);

            expect(result.deaths).toHaveLength(2);
            expect(result.deaths).toContain('p5');
            expect(result.deaths).toContain('p6');
        });

        it('should handle guard protection with witch poison', () => {
            // Guard protects p5, Werewolf attacks p5, Witch poisons p6
            const protectCommand = new GuardProtectCommand('p2', 'p5');
            const killCommand = new WerewolfKillCommand('p1', 'p5');
            const poisonCommand = new WitchPoisonCommand('p4', 'p6');

            const result = resolver.resolve(gameState, [protectCommand, killCommand, poisonCommand]);

            expect(result.deaths).toHaveLength(1);
            expect(result.deaths).toContain('p6');
            expect(result.savedPlayers).toContain('p5');
        });

        it('should clear temporary night statuses after resolution', () => {
            // Werewolf attacks p5, Guard protects p5
            const killCommand = new WerewolfKillCommand('p1', 'p5');
            const protectCommand = new GuardProtectCommand('p2', 'p5');

            const result = resolver.resolve(gameState, [killCommand, protectCommand]);

            const player = result.state.getPlayer('p5');

            // Temporary statuses should be cleared
            expect(player?.isBitten).toBe(false);
            expect(player?.isProtected).toBe(false);

            // Player should still be alive
            expect(player?.isAlive).toBe(true);
        });
    });

    describe('Witch Ability Restrictions', () => {
        it('should prevent witch from using heal twice', () => {
            // First night: Witch heals
            const killCommand1 = new WerewolfKillCommand('p1', 'p5');
            const healCommand1 = new WitchHealCommand('p4', 'p5');

            let result = resolver.resolve(gameState, [killCommand1, healCommand1]);

            const witch = result.state.getPlayer('p4');
            expect(witch?.hasStatus(PlayerStatus.USED_HEAL)).toBe(true);

            // Second night: Try to heal again (should fail)
            const newState = new DomainGameState(
                result.state.players,
                2,
                'night'
            );

            const killCommand2 = new WerewolfKillCommand('p1', 'p6');
            const healCommand2 = new WitchHealCommand('p4', 'p6');

            expect(healCommand2.canExecute(newState)).toBe(false);
        });

        it('should prevent witch from using poison twice', () => {
            // First night: Witch poisons
            const poisonCommand1 = new WitchPoisonCommand('p4', 'p5');

            let result = resolver.resolve(gameState, [poisonCommand1]);

            const witch = result.state.getPlayer('p4');
            expect(witch?.hasStatus(PlayerStatus.USED_POISON)).toBe(true);

            // Second night: Try to poison again (should fail)
            const newState = new DomainGameState(
                result.state.players,
                2,
                'night'
            );

            const poisonCommand2 = new WitchPoisonCommand('p4', 'p6');

            expect(poisonCommand2.canExecute(newState)).toBe(false);
        });
    });

    describe('Guard Restrictions', () => {
        it('should prevent guard from protecting same person consecutively', () => {
            // First night: Guard protects p5
            const protectCommand1 = new GuardProtectCommand('p2', 'p5');

            let result = resolver.resolve(gameState, [protectCommand1]);

            const guard = result.state.getPlayer('p2');
            expect(guard?.lastProtectedTargetId).toBe('p5');

            // Second night: Try to protect p5 again (should fail)
            const newState = new DomainGameState(
                result.state.players,
                2,
                'night'
            );

            const protectCommand2 = new GuardProtectCommand('p2', 'p5');

            expect(protectCommand2.canExecute(newState)).toBe(false);
        });

        it('should allow guard to protect different person', () => {
            // First night: Guard protects p5
            const protectCommand1 = new GuardProtectCommand('p2', 'p5');

            let result = resolver.resolve(gameState, [protectCommand1]);

            // Second night: Guard protects p6 (should succeed)
            const newState = new DomainGameState(
                result.state.players,
                2,
                'night'
            );

            const protectCommand2 = new GuardProtectCommand('p2', 'p6');

            expect(protectCommand2.canExecute(newState)).toBe(true);
        });
    });

    describe('Night Order Execution', () => {
        it('should execute commands in thu_tu_goi order', () => {
            // Commands will be executed in order: bao_ve, soi, phu_thuy, tien_tri
            const protectCommand = new GuardProtectCommand('p2', 'p5');
            const killCommand = new WerewolfKillCommand('p1', 'p5');
            const healCommand = new WitchHealCommand('p4', 'p5');

            // Even though heal is added last, it should execute after werewolf attack
            const result = resolver.resolve(gameState, [healCommand, killCommand, protectCommand]);

            // Player should be saved (protected before attacked)
            expect(result.savedPlayers).toContain('p5');
            expect(result.deaths).toHaveLength(0);
        });
    });
});
