import { loadRoles, loadScenarios } from '../../../utils/assetLoader';
import { getNightSequence } from '../../nightSequence';
import { resolveNightEvents } from '../../NightResolution';
import { GameSession, NightAction, Player } from '../../../types';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: overrides.id || `p_${Math.random()}`,
  name: overrides.name || 'Player',
  color: overrides.color || '#ffffff',
  roleId: overrides.roleId || 'dan_lang',
  isAlive: overrides.isAlive ?? true,
  position: overrides.position ?? 0,
  ...overrides,
});

describe('New role night flow (legacy resolver + sequence)', () => {
  const roles = loadRoles();

  test('SP-02: infected wolves skip their kill this night', () => {
    const players: Player[] = [
      makePlayer({ id: 'w1', roleId: 'soi', name: 'Wolf' }),
      makePlayer({ id: 'v1', roleId: 'dan_lang', name: 'Villager' }),
    ];

    const actions: NightAction[] = [
      { roleId: 'soi', targetPlayerId: 'v1', timestamp: Date.now(), actionType: 'kill' },
    ];

    const result = resolveNightEvents(actions, players, roles, [], 2, 2);

    expect(result.wolfInfectedSkip).toBe(true);
    expect(result.deadPlayerIds.includes('v1')).toBe(false);
  });

  test('SP-06: vampire kill is not blocked while wolves are infected', () => {
    const players: Player[] = [
      makePlayer({ id: 'w1', roleId: 'soi', name: 'Wolf' }),
      makePlayer({ id: 'mcr', roleId: 'ma_ca_rong', name: 'Vampire' }),
      makePlayer({ id: 'v1', roleId: 'dan_lang', name: 'Villager' }),
    ];

    const actions: NightAction[] = [
      { roleId: 'soi', targetPlayerId: 'v1', timestamp: Date.now(), actionType: 'kill' },
      { roleId: 'ma_ca_rong', targetPlayerId: 'v1', timestamp: Date.now(), actionType: 'kill' },
    ];

    const result = resolveNightEvents(actions, players, roles, [], 2, 2);

    expect(result.wolfInfectedSkip).toBe(true);
    expect(result.deadPlayerIds).toContain('v1');
    expect(result.deathCauses?.['v1']).toBe('vampire');
  });

  test('GRR-06: Khăn Đỏ not in sequence before unlock', () => {
    const scenario = loadScenarios().find(s => s.id === '9');
    expect(scenario).toBeDefined();

    const session = {
      redRidingHoodPowerUnlocked: false,
      redRidingHoodUnlockRound: null,
      players: [makePlayer({ id: 'kd', roleId: 'khan_do', isAlive: true })],
    } as GameSession;

    const seq = getNightSequence(scenario!, roles, 2, undefined, session);
    expect(seq.some(r => r.id === 'khan_do')).toBe(false);
  });

  test('GRR-07: Khăn Đỏ not in sequence on unlock night', () => {
    const scenario = loadScenarios().find(s => s.id === '9');
    expect(scenario).toBeDefined();

    const session = {
      redRidingHoodPowerUnlocked: true,
      redRidingHoodUnlockRound: 2,
      players: [makePlayer({ id: 'kd', roleId: 'khan_do', isAlive: true })],
    } as GameSession;

    const seq = getNightSequence(scenario!, roles, 2, undefined, session);
    expect(seq.some(r => r.id === 'khan_do')).toBe(false);
  });

  test('GRR-08: Khăn Đỏ appears from night after unlock', () => {
    const scenario = loadScenarios().find(s => s.id === '9');
    expect(scenario).toBeDefined();

    const session = {
      redRidingHoodPowerUnlocked: true,
      redRidingHoodUnlockRound: 2,
      players: [makePlayer({ id: 'kd', roleId: 'khan_do', isAlive: true })],
    } as GameSession;

    const seq = getNightSequence(scenario!, roles, 3, undefined, session);
    expect(seq.some(r => r.id === 'khan_do')).toBe(true);
  });

  test('GRR-10: dead Khăn Đỏ is excluded from sequence even when unlocked', () => {
    const scenario = loadScenarios().find(s => s.id === '9');
    expect(scenario).toBeDefined();

    const session = {
      redRidingHoodPowerUnlocked: true,
      redRidingHoodUnlockRound: 1,
      players: [makePlayer({ id: 'kd', roleId: 'khan_do', isAlive: false })],
    } as GameSession;

    const seq = getNightSequence(scenario!, roles, 2, undefined, session);
    expect(seq.some(r => r.id === 'khan_do')).toBe(false);
  });
});
