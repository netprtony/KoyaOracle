import { resolveNightEvents } from '../../NightResolution';
import { Player, NightAction } from '../../../types';
import { Role } from '../../../../assets/role-types';

describe('Thanh Niên Cứng — delayed death (legacy NightResolution)', () => {
  const roles: Role[] = [
    { id: 'soi', name: 'Sói', team: 'werewolf', iconEmoji: '🐺', description: '' } as any,
    { id: 'thanh_nien_cung', name: 'Thanh Niên Cứng', team: 'villager', iconEmoji: '💪', description: '' } as any,
    { id: 'phu_thuy', name: 'Phù Thủy', team: 'villager', iconEmoji: '🧪', description: '' } as any,
  ];

  const wolfKill = (targetId: string): NightAction => ({
    roleId: 'soi',
    targetPlayerId: targetId,
    timestamp: 1,
    actionType: 'kill',
  });

  const witchHeal = (targetId: string): NightAction => ({
    roleId: 'phu_thuy',
    targetPlayerId: targetId,
    timestamp: 2,
    actionType: 'heal',
  });

  const makeWolf = (): Player => ({
    id: 'W',
    name: 'Wolf',
    color: '#000',
    roleId: 'soi',
    isAlive: true,
    position: 0,
  });

  const makeWitch = (): Player => ({
    id: 'WT',
    name: 'Witch',
    color: '#999',
    roleId: 'phu_thuy',
    isAlive: true,
    position: 1,
  });

  const makeToughGuy = (overrides: Partial<Player> = {}): Player => ({
    id: 'TNC',
    name: 'ToughGuy',
    color: '#f00',
    roleId: 'thanh_nien_cung',
    isAlive: true,
    position: 2,
    toughGuyBittenNight: null,
    scheduledDeathNight: null,
    scheduledDeathCause: null,
    ...overrides,
  });

  it('TNC-01: Bị Sói cắn đêm N → không chết ngay, được schedule', () => {
    const players: Player[] = [makeWolf(), makeToughGuy()];

    const result = resolveNightEvents([wolfKill('TNC')], players, roles, [], 1);

    expect(result.deadPlayerIds).not.toContain('TNC');
    expect(result.toughGuyBitten?.[0]).toMatchObject({
      playerId: 'TNC',
      bittenNight: 1,
      scheduledNight: 2,
      cause: 'werewolf',
    });
  });

  it('TNC-02: Đến đêm N+1 → chết theo scheduled death', () => {
    const players: Player[] = [
      makeWolf(),
      makeToughGuy({
        toughGuyBittenNight: 1,
        scheduledDeathNight: 2,
        scheduledDeathCause: 'werewolf',
      }),
    ];

    const result = resolveNightEvents([], players, roles, [], 2);

    expect(result.deadPlayerIds).toContain('TNC');
    expect(result.deathCauses?.['TNC']).toBe('tough_guy_scheduled');
  });

  it('TNC-03: Witch cứu cùng đêm bị cắn → không schedule', () => {
    const players: Player[] = [makeWolf(), makeWitch(), makeToughGuy()];

    const result = resolveNightEvents([wolfKill('TNC'), witchHeal('TNC')], players, roles, [], 1);

    expect(result.deadPlayerIds).not.toContain('TNC');
    expect(result.toughGuyBitten).toBeUndefined();
  });

  it('TNC-04: Đã bị schedule (chưa tới hạn) mà bị cắn lại → chết ngay', () => {
    const players: Player[] = [
      makeWolf(),
      makeToughGuy({
        toughGuyBittenNight: 1,
        scheduledDeathNight: 3,
        scheduledDeathCause: 'werewolf',
      }),
    ];

    const result = resolveNightEvents([wolfKill('TNC')], players, roles, [], 2);

    expect(result.deadPlayerIds).toContain('TNC');
    expect(result.deathCauses?.['TNC']).toBe('werewolf');
  });
});
