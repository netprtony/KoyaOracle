import { loadRoles, loadScenarios } from '../../../utils/assetLoader';
import { GameSession, Player } from '../../../types';
import { useNightPhaseStore } from '../nightPhaseSlice';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: overrides.id || `p_${Math.random()}`,
  name: overrides.name || 'Player',
  color: overrides.color || '#ffffff',
  roleId: overrides.roleId || 'dan_lang',
  isAlive: overrides.isAlive ?? true,
  position: overrides.position ?? 0,
  ...overrides,
});

function makeSession(players: Player[]): GameSession {
  return {
    id: 'session_slice_test',
    mode: 'RANDOM_ROLE' as any,
    scenarioId: '9',
    players,
    currentPhase: { type: 'NIGHT', number: 3 },
    matchLog: [],
    nightActions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    redRidingHoodPowerUnlocked: true,
    redRidingHoodUnlockRound: 1,
  };
}

describe('nightPhaseSlice state persistence', () => {
  const roles = loadRoles();
  const scenario9 = loadScenarios().find(s => s.id === '9')!;

  beforeEach(() => {
    useNightPhaseStore.getState().clearNightSession();
  });

  test('persists action state and flags modifications when updated', () => {
    const session = makeSession([
      makePlayer({ id: 'wolf1', roleId: 'soi', name: 'Soi 1' }),
      makePlayer({ id: 'seer', roleId: 'tien_tri', name: 'Tien Tri' }),
      makePlayer({ id: 'villager1', roleId: 'dan_lang', name: 'Dan Lang 1' }),
      makePlayer({ id: 'villager2', roleId: 'dan_lang', name: 'Dan Lang 2' }),
    ]);

    useNightPhaseStore.getState().initNightQueue({
      scenario: scenario9,
      availableRoles: roles,
      nightNumber: 3,
      session,
    });

    useNightPhaseStore.getState().setNightAction('wolf_pack', 'wolf_pack', {
      type: 'WOLF_KILL',
      targetId: 'villager1',
      targetName: 'Dan Lang 1',
      wolfCubVote: false,
    });

    const first = useNightPhaseStore.getState().getNightAction('wolf_pack', 'wolf_pack');
    expect(first).not.toBeNull();
    expect(first?.isModified).toBe(false);

    useNightPhaseStore.getState().setNightAction('wolf_pack', 'wolf_pack', {
      type: 'WOLF_KILL',
      targetId: 'villager2',
      targetName: 'Dan Lang 2',
      wolfCubVote: false,
    });

    const second = useNightPhaseStore.getState().getNightAction('wolf_pack', 'wolf_pack');
    expect(second?.type).toBe('WOLF_KILL');
    if (second?.type === 'WOLF_KILL') {
      expect(second.targetId).toBe('villager2');
    } else {
      throw new Error('Expected WOLF_KILL action');
    }
    expect(second?.isModified).toBe(true);
  });
});
