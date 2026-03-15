import { resolveNightEvents } from '../../NightResolution';
import { Player, NightAction } from '../../../types';
import { Role } from '../../../../assets/role-types';

describe('Lovers — death-link restored (legacy NightResolution)', () => {
  const roles: Role[] = [
    { id: 'soi', name: 'Sói', team: 'werewolf', iconEmoji: '🐺', description: '' } as any,
    { id: 'dan_lang', name: 'Dân Làng', team: 'villager', iconEmoji: '👤', description: '' } as any,
  ];

  const wolfKill = (targetId: string): NightAction => ({
    roleId: 'soi',
    targetPlayerId: targetId,
    timestamp: 1,
    actionType: 'kill',
  });

  it('L-01: Lover A chết → Lover B chết theo (BROKEN HEART)', () => {
    const lovers: Player[] = [
      {
        id: 'W',
        name: 'Wolf',
        color: '#000',
        roleId: 'soi',
        isAlive: true,
        position: 0,
      },
      {
        id: 'A',
        name: 'Alice',
        color: '#f00',
        roleId: 'dan_lang',
        isAlive: true,
        position: 1,
        isLover: true,
        loverId: 'B',
      },
      {
        id: 'B',
        name: 'Bob',
        color: '#0f0',
        roleId: 'dan_lang',
        isAlive: true,
        position: 2,
        isLover: true,
        loverId: 'A',
      },
    ];

    const result = resolveNightEvents([wolfKill('A')], lovers, roles, [], 1);

    expect(result.deadPlayerIds).toEqual(expect.arrayContaining(['A', 'B']));
    expect(result.deathCauses?.['B']).toBe('lover_heartbreak');
  });

  it('L-02: Không có vòng lặp vô hạn', () => {
    const lovers: Player[] = [
      {
        id: 'W',
        name: 'Wolf',
        color: '#000',
        roleId: 'soi',
        isAlive: true,
        position: 0,
      },
      {
        id: 'A',
        name: 'Alice',
        color: '#f00',
        roleId: 'dan_lang',
        isAlive: true,
        position: 1,
        isLover: true,
        loverId: 'B',
      },
      {
        id: 'B',
        name: 'Bob',
        color: '#0f0',
        roleId: 'dan_lang',
        isAlive: true,
        position: 2,
        isLover: true,
        loverId: 'A',
      },
    ];

    const result = resolveNightEvents([wolfKill('A')], lovers, roles, [], 1);
    // Exactly two unique deaths
    expect(new Set(result.deadPlayerIds).size).toBe(2);
  });
});
