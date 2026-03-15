import { getSeerScanResult } from '../../logic/SeerScanLogic';

describe('Con Lai — Half-Blood seer scan', () => {
  it('HB-01: Tiên Tri soi Con Lai → WEREWOLF', () => {
    expect(getSeerScanResult('con_lai')).toBe('WEREWOLF');
  });
});
