import { loadRoles, loadScenarios } from '../../../utils/assetLoader';
import { GameSession, Player } from '../../../types';
import { initNightQueue } from '../../nightSequence';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: overrides.id || `p_${Math.random()}`,
  name: overrides.name || 'Player',
  color: overrides.color || '#ffffff',
  roleId: overrides.roleId || 'dan_lang',
  isAlive: overrides.isAlive ?? true,
  position: overrides.position ?? 0,
  ...overrides,
});

function buildSession(players: Player[], redUnlocked = false, unlockRound: number | null = null): GameSession {
  return {
    id: 'session_test_9',
    mode: 'RANDOM_ROLE' as any,
    scenarioId: '9',
    players,
    currentPhase: { type: 'NIGHT', number: 3 },
    matchLog: [],
    nightActions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    redRidingHoodPowerUnlocked: redUnlocked,
    redRidingHoodUnlockRound: unlockRound,
  };
}

describe('Night queue init - KichBan 9', () => {
  const roles = loadRoles();
  const scenario9 = loadScenarios().find(s => s.id === '9');

  test('builds a unified wolf_pack and keeps nanh_soi sleeping while main wolves are alive', () => {
    expect(scenario9).toBeDefined();

    const session = buildSession([
      makePlayer({ id: 'wolf1', roleId: 'soi', name: 'Soi 1' }),
      makePlayer({ id: 'wolf2', roleId: 'soi_con', name: 'Soi Con' }),
      makePlayer({ id: 'wolf3', roleId: 'soi_don_doc', name: 'Soi Don Doc' }),
      makePlayer({ id: 'fang', roleId: 'nanh_soi', name: 'Nanh Soi' }),
      makePlayer({ id: 'seer', roleId: 'tien_tri', name: 'Tien Tri' }),
      makePlayer({ id: 'guard', roleId: 'bao_ve', name: 'Bao Ve' }),
      makePlayer({ id: 'villager', roleId: 'dan_lang', name: 'Dan Lang' }),
    ]);

    const queue = initNightQueue(scenario9!, roles, 3, session);

    const wolfPack = queue.find(item => item.roleId === 'wolf_pack');
    const sleepingFang = queue.find(item => item.roleId === 'nanh_soi');

    expect(wolfPack).toBeDefined();
    expect(wolfPack?.isActive).toBe(true);

    expect(sleepingFang).toBeDefined();
    expect(sleepingFang?.isActive).toBe(false);
    expect(sleepingFang?.actionState?.type).toBe('SKIPPED');

    expect(queue.some(item => item.roleId === 'soi')).toBe(false);
    expect(queue.some(item => item.roleId === 'soi_con')).toBe(false);
    expect(queue.some(item => item.roleId === 'soi_don_doc')).toBe(false);
  });

  test('activates nanh_soi in wolf_pack when it is the last alive wolf', () => {
    expect(scenario9).toBeDefined();

    const session = buildSession([
      makePlayer({ id: 'wolf1', roleId: 'soi', name: 'Soi 1', isAlive: false }),
      makePlayer({ id: 'wolf2', roleId: 'soi_con', name: 'Soi Con', isAlive: false }),
      makePlayer({ id: 'wolf3', roleId: 'soi_don_doc', name: 'Soi Don Doc', isAlive: false }),
      makePlayer({ id: 'fang', roleId: 'nanh_soi', name: 'Nanh Soi', isAlive: true }),
      makePlayer({ id: 'seer', roleId: 'tien_tri', name: 'Tien Tri', isAlive: true }),
      makePlayer({ id: 'villager', roleId: 'dan_lang', name: 'Dan Lang', isAlive: true }),
    ]);

    const queue = initNightQueue(scenario9!, roles, 3, session);

    const wolfPack = queue.find(item => item.roleId === 'wolf_pack');
    const sleepingFang = queue.find(item => item.roleId === 'nanh_soi');

    expect(wolfPack).toBeDefined();
    expect(wolfPack?.isActive).toBe(true);
    expect(sleepingFang).toBeUndefined();
  });
});
