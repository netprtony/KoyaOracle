/**
 * WinConditionChecker Tests
 */

import { WinConditionChecker } from '../WinConditionChecker';
import { PlayerStateManager, PlayerInput } from '../PlayerStateManager';
import { resetRoleManager } from '../RoleManager';

describe('WinConditionChecker', () => {
    let stateManager: PlayerStateManager;
    let winChecker: WinConditionChecker;

    const createPlayers = (config: { villagers: number; werewolves: number; vampires?: number; neutrals?: number }): PlayerInput[] => {
        const players: PlayerInput[] = [];
        let id = 1;

        for (let i = 0; i < config.villagers; i++) {
            players.push({ id: `p${id}`, name: `Villager ${i}`, roleId: 'dan_lang', team: 'villager' });
            id++;
        }
        for (let i = 0; i < config.werewolves; i++) {
            players.push({ id: `p${id}`, name: `Werewolf ${i}`, roleId: 'soi', team: 'werewolf' });
            id++;
        }
        for (let i = 0; i < (config.vampires || 0); i++) {
            players.push({ id: `p${id}`, name: `Vampire ${i}`, roleId: 'ma_ca_rong', team: 'vampire' });
            id++;
        }
        for (let i = 0; i < (config.neutrals || 0); i++) {
            players.push({ id: `p${id}`, name: `Neutral ${i}`, roleId: 'ke_chan_doi', team: 'neutral' });
            id++;
        }

        return players;
    };

    beforeEach(() => {
        resetRoleManager();
        stateManager = new PlayerStateManager();
    });

    describe('Team Wins', () => {
        it('should detect villager win when all werewolves dead', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 3, werewolves: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill all werewolves
            stateManager.killPlayer('p4');
            stateManager.killPlayer('p5');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('villager');
            expect(result.winCondition).toBe('villagerTeamWins');
        });

        it('should detect werewolf win when werewolves >= non-werewolves', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 2, werewolves: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill 1 villager (leaves 1 villager, 2 werewolves)
            stateManager.killPlayer('p1');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('werewolf');
        });

        it('should detect vampire win when only vampires left', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 2, werewolves: 1, vampires: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill all villagers and werewolves
            stateManager.killPlayer('p1');
            stateManager.killPlayer('p2');
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('vampire');
        });

        it('should not declare winner when game is ongoing', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 4, werewolves: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill 1 villager (leaves 3 villagers, 2 werewolves - game continues)
            stateManager.killPlayer('p1');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(false);
        });
    });

    describe('Individual Wins', () => {
        it('should detect Kẻ Chán Đời win on execution', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'ke_chan_doi', team: 'neutral' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Execute Kẻ Chán Đời
            stateManager.killPlayer('p2');
            const state = stateManager.getState('p2');
            if (state) state.killedBy = 'execution';

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('ke_chan_doi');
            expect(result.winCondition).toBe('dieByExecution');
        });

        it('should not give Kẻ Chán Đời win if killed by other means', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'ke_chan_doi', team: 'neutral' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Kill by werewolf
            stateManager.killPlayer('p2');
            const state = stateManager.getState('p2');
            if (state) state.killedBy = 'werewolf';

            const result = winChecker.checkWinConditions();
            // Should not be ke_chan_doi win
            expect(result.winner).not.toBe('ke_chan_doi');
        });

        it('should detect Du Côn win when targets dead and self alive', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'du_con', team: 'neutral' },
                { id: 'p2', name: 'Player 2', roleId: 'dan_lang', team: 'villager' },
                { id: 'p3', name: 'Player 3', roleId: 'dan_lang', team: 'villager' },
                { id: 'p4', name: 'Player 4', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Mark targets for Du Côn
            stateManager.setMarkedTargets('p1', ['p2', 'p3']);

            // Kill the marked targets
            stateManager.killPlayer('p2');
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('du_con');
        });

        it('should detect Sói Đơn Độc win', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'soi_don_doc', team: 'werewolf' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Kill other werewolf, leaving only Sói Đơn Độc
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('soi_don_doc');
            expect(result.winCondition).toBe('beLastWerewolfAlive');
        });
    });

    describe('Group Wins', () => {
        it('should detect lovers win when they are last 2 survivors (different teams)', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'soi', team: 'werewolf' },
                { id: 'p3', name: 'Player 3', roleId: 'dan_lang', team: 'villager' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Create lovers between different teams
            stateManager.createLovers('p1', 'p2');

            // Kill the other player
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('lovers');
            expect(result.winCondition).toBe('beLastTwoSurvivors');
        });

        it('should not give lovers win if same team', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'dan_lang', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'bao_ve', team: 'villager' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Create lovers between same team
            stateManager.createLovers('p1', 'p2');

            // Kill werewolf
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('villager'); // Not lovers, but villager team win
        });

        it('should detect twins win', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'song_sinh', team: 'villager' },
                { id: 'p2', name: 'Player 2', roleId: 'song_sinh', team: 'villager' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Create twins
            stateManager.createTwins('p1', 'p2');

            // Kill werewolf
            stateManager.killPlayer('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('twins');
        });

        it('should detect cult win', () => {
            const players: PlayerInput[] = [
                { id: 'p1', name: 'Player 1', roleId: 'chu_giao_phai', team: 'neutral' },
                { id: 'p2', name: 'Player 2', roleId: 'dan_lang', team: 'villager' },
                { id: 'p3', name: 'Player 3', roleId: 'soi', team: 'werewolf' },
            ];
            stateManager.initializePlayers(players);
            winChecker = new WinConditionChecker(stateManager);

            // Add all players to cult
            stateManager.addToCult('p2');
            stateManager.addToCult('p3');

            const result = winChecker.checkWinConditions();
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('cult');
            expect(result.winCondition).toBe('allAliveBelongToCult');
        });
    });

    describe('checkPlayerWin', () => {
        it('should return win for player in winning team', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 3, werewolves: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill all werewolves
            stateManager.killPlayer('p4');
            stateManager.killPlayer('p5');

            const result = winChecker.checkPlayerWin('p1');
            expect(result.hasWinner).toBe(true);
            expect(result.winner).toBe('villager');
        });

        it('should return no win for dead player in losing team', () => {
            stateManager.initializePlayers(createPlayers({ villagers: 2, werewolves: 2 }));
            winChecker = new WinConditionChecker(stateManager);

            // Kill enough villagers for werewolf win
            stateManager.killPlayer('p1');

            const result = winChecker.checkPlayerWin('p1');
            expect(result.winner).not.toBe('villager');
        });
    });
});
