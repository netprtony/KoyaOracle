/**
 * PlayerStateManager Tests
 */

import { PlayerStateManager, PlayerInput } from '../PlayerStateManager';

describe('PlayerStateManager', () => {
    let stateManager: PlayerStateManager;

    const createTestPlayers = (): PlayerInput[] => [
        { id: 'p1', name: 'Player 1', roleId: 'soi', team: 'werewolf' },
        { id: 'p2', name: 'Player 2', roleId: 'tien_tri', team: 'villager' },
        { id: 'p3', name: 'Player 3', roleId: 'bao_ve', team: 'villager' },
        { id: 'p4', name: 'Player 4', roleId: 'dan_lang', team: 'villager' },
        { id: 'p5', name: 'Player 5', roleId: 'soi_con', team: 'werewolf' },
    ];

    beforeEach(() => {
        stateManager = new PlayerStateManager();
        stateManager.initializePlayers(createTestPlayers());
    });

    describe('initializePlayers', () => {
        it('should initialize all players', () => {
            const states = stateManager.getAllStates();
            expect(states.length).toBe(5);
        });

        it('should set initial state correctly', () => {
            const state = stateManager.getState('p1');
            expect(state).toBeDefined();
            expect(state?.isAlive).toBe(true);
            expect(state?.isProtected).toBe(false);
            expect(state?.isSilenced).toBe(false);
            expect(state?.voteWeight).toBe(1);
        });
    });

    describe('getState', () => {
        it('should return state for valid player', () => {
            const state = stateManager.getState('p1');
            expect(state?.roleId).toBe('soi');
            expect(state?.team).toBe('werewolf');
        });

        it('should return undefined for invalid player', () => {
            const state = stateManager.getState('invalid');
            expect(state).toBeUndefined();
        });
    });

    describe('getAlivePlayers', () => {
        it('should return all alive players initially', () => {
            const alive = stateManager.getAlivePlayers();
            expect(alive.length).toBe(5);
        });

        it('should exclude dead players', () => {
            stateManager.killPlayer('p1');
            const alive = stateManager.getAlivePlayers();
            expect(alive.length).toBe(4);
            expect(alive.some(p => p.playerId === 'p1')).toBe(false);
        });
    });

    describe('getPlayersByTeam', () => {
        it('should return werewolves', () => {
            const werewolves = stateManager.getPlayersByTeam('werewolf');
            expect(werewolves.length).toBe(2);
        });

        it('should return villagers', () => {
            const villagers = stateManager.getPlayersByTeam('villager');
            expect(villagers.length).toBe(3);
        });
    });

    describe('protection status', () => {
        it('should set protected status', () => {
            stateManager.setProtected('p1', true);
            expect(stateManager.getState('p1')?.isProtected).toBe(true);
        });

        it('should unset protected status', () => {
            stateManager.setProtected('p1', true);
            stateManager.setProtected('p1', false);
            expect(stateManager.getState('p1')?.isProtected).toBe(false);
        });
    });

    describe('blessed status', () => {
        it('should set blessed status', () => {
            stateManager.setBlessed('p2', true);
            expect(stateManager.getState('p2')?.isBlessed).toBe(true);
        });
    });

    describe('silenced status', () => {
        it('should set silenced status', () => {
            stateManager.setSilenced('p2', true);
            expect(stateManager.getState('p2')?.isSilenced).toBe(true);
        });
    });

    describe('exiled status', () => {
        it('should set exiled status and disable voting', () => {
            stateManager.setExiled('p2', true);
            const state = stateManager.getState('p2');
            expect(state?.isExiled).toBe(true);
            expect(state?.canVote).toBe(false);
        });
    });

    describe('death handling', () => {
        it('should mark player for death', () => {
            stateManager.markForDeath('p1', 'werewolf', 0);
            const state = stateManager.getState('p1');
            expect(state?.markedForDeath).toBe(true);
            expect(state?.killedBy).toBe('werewolf');
        });

        it('should kill player immediately if delay is 0', () => {
            stateManager.markForDeath('p1', 'werewolf', 0);
            stateManager.killPlayer('p1');
            expect(stateManager.getState('p1')?.isAlive).toBe(false);
        });

        it('should save player from death', () => {
            stateManager.markForDeath('p1', 'werewolf', 0);
            stateManager.saveFromDeath('p1');
            const state = stateManager.getState('p1');
            expect(state?.markedForDeath).toBe(false);
            expect(state?.killedBy).toBeUndefined();
        });
    });

    describe('lovers relationship', () => {
        it('should create lovers', () => {
            stateManager.createLovers('p1', 'p2');

            const state1 = stateManager.getState('p1');
            const state2 = stateManager.getState('p2');

            expect(state1?.isLovers).toBe(true);
            expect(state1?.loverPartnerId).toBe('p2');
            expect(state2?.isLovers).toBe(true);
            expect(state2?.loverPartnerId).toBe('p1');
        });
    });

    describe('twins relationship', () => {
        it('should create twins', () => {
            stateManager.createTwins('p3', 'p4');

            const state1 = stateManager.getState('p3');
            const state2 = stateManager.getState('p4');

            expect(state1?.isTwin).toBe(true);
            expect(state1?.twinPartnerId).toBe('p4');
            expect(state2?.isTwin).toBe(true);
            expect(state2?.twinPartnerId).toBe('p3');
        });
    });

    describe('cult membership', () => {
        it('should add to cult', () => {
            stateManager.addToCult('p2');
            expect(stateManager.getState('p2')?.isCultMember).toBe(true);
        });
    });

    describe('transformation', () => {
        it('should transform player', () => {
            stateManager.transformPlayer('p2', 'soi', 'werewolf');
            const state = stateManager.getState('p2');

            expect(state?.roleId).toBe('soi');
            expect(state?.team).toBe('werewolf');
            expect(state?.originalRoleId).toBe('tien_tri');
            expect(state?.hasTransformed).toBe(true);
        });
    });

    describe('role swap', () => {
        it('should swap roles between players', () => {
            stateManager.swapRoles('p1', 'p2');

            const state1 = stateManager.getState('p1');
            const state2 = stateManager.getState('p2');

            expect(state1?.roleId).toBe('tien_tri');
            expect(state1?.team).toBe('villager');
            expect(state2?.roleId).toBe('soi');
            expect(state2?.team).toBe('werewolf');
        });
    });

    describe('ability tracking', () => {
        it('should track used abilities', () => {
            stateManager.useAbility('p1', 'testAbility');
            expect(stateManager.hasUsedAbility('p1', 'testAbility')).toBe(true);
            expect(stateManager.hasUsedAbility('p1', 'otherAbility')).toBe(false);
        });
    });

    describe('target restrictions', () => {
        it('should track last protected target', () => {
            stateManager.setLastProtected('p3', 'p2');
            expect(stateManager.getState('p3')?.lastProtectedId).toBe('p2');
        });

        it('should track last silenced target', () => {
            stateManager.setLastSilenced('p3', 'p4');
            expect(stateManager.getState('p3')?.lastSilencedId).toBe('p4');
        });
    });

    describe('adjacent players', () => {
        it('should get adjacent players for middle player', () => {
            const adjacent = stateManager.getAdjacentPlayers('p3');
            expect(adjacent).toContain('p2');
            expect(adjacent).toContain('p4');
            expect(adjacent.length).toBe(2);
        });

        it('should wrap around for first player', () => {
            const adjacent = stateManager.getAdjacentPlayers('p1');
            expect(adjacent).toContain('p5'); // Last player
            expect(adjacent).toContain('p2');
        });

        it('should exclude dead adjacent players', () => {
            stateManager.killPlayer('p2');
            const adjacent = stateManager.getAdjacentPlayers('p3');
            expect(adjacent).not.toContain('p2');
        });
    });

    describe('vote weight', () => {
        it('should set vote weight', () => {
            stateManager.setVoteWeight('p2', 2);
            expect(stateManager.getState('p2')?.voteWeight).toBe(2);
        });
    });

    describe('night status reset', () => {
        it('should reset protection but not blessing', () => {
            stateManager.setProtected('p1', true);
            stateManager.setBlessed('p2', true);

            stateManager.resetNightStatuses();

            expect(stateManager.getState('p1')?.isProtected).toBe(false);
            expect(stateManager.getState('p2')?.isBlessed).toBe(true);
        });
    });

    describe('day status reset', () => {
        it('should reset silenced and exiled', () => {
            stateManager.setSilenced('p1', true);
            stateManager.setExiled('p2', true);

            stateManager.resetDayStatuses();

            expect(stateManager.getState('p1')?.isSilenced).toBe(false);
            expect(stateManager.getState('p2')?.isExiled).toBe(false);
            expect(stateManager.getState('p2')?.canVote).toBe(true);
        });
    });

    describe('delayed deaths', () => {
        it('should process delayed deaths', () => {
            // markForDeath with delay=1 means the player will die after 1 cycle
            stateManager.markForDeath('p1', 'werewolf', 1);

            // First call: decrement delay from 1 to 0, player dies
            let deaths = stateManager.processDelayedDeaths();
            expect(deaths).toContain('p1');
            expect(stateManager.getState('p1')?.isAlive).toBe(false);
        });

        it('should not process immediate deaths (delay=0)', () => {
            stateManager.markForDeath('p1', 'werewolf', 0);

            // delay=0 means immediate, processDelayedDeaths shouldn't handle it
            let deaths = stateManager.processDelayedDeaths();
            expect(deaths.length).toBe(0);
            // Player is still marked for death but alive (needs killPlayer call)
            expect(stateManager.getState('p1')?.markedForDeath).toBe(true);
        });
    });

    describe('werewolf infection', () => {
        it('should infect all werewolves', () => {
            stateManager.infectWerewolves();

            expect(stateManager.getState('p1')?.werewolvesInfected).toBe(true);
            expect(stateManager.getState('p5')?.werewolvesInfected).toBe(true);
            expect(stateManager.getState('p2')?.werewolvesInfected).toBe(false);
        });

        it('should clear infection', () => {
            stateManager.infectWerewolves();
            stateManager.clearWerewolfInfection();

            expect(stateManager.getState('p1')?.werewolvesInfected).toBe(false);
        });
    });
});
