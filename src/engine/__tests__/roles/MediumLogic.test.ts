/**
 * Medium (Bà Đồng) logic tests
 *
 * Tests cover:
 *  1. isSeerRole returns true for all Tiên Tri variants
 *  2. isSeerRole returns false for non-seer roles
 *  3. getSeerScanResult returns HUMAN for Bà Đồng
 *  4. getSeerScanResult returns WEREWOLF for Sói
 *  5. getSeerScanResult returns HUMAN for Mục Sư (masking)
 *  6. getSeerScanResult handles null roleId gracefully
 *  7. Medium scry on dead Tiên Tri still returns INCORRECT
 */

import { isSeerRole, getSeerScanResult, appearsHumanToSeer } from '../../logic/SeerScanLogic';
import { Player } from '../../../types';

// ── helpers ──────────────────────────────────────────────────────────────────

const makePlayer = (roleId: string, isAlive = true): Player => ({
    id: `p_${roleId}`,
    name: roleId,
    color: '#fff',
    roleId,
    isAlive,
    position: 0,
});

// ── isSeerRole ────────────────────────────────────────────────────────────────

describe('isSeerRole', () => {
    it('returns true for base tien_tri', () => {
        expect(isSeerRole('tien_tri')).toBe(true);
    });

    it('returns true for tien_tri_tap_su', () => {
        expect(isSeerRole('tien_tri_tap_su')).toBe(true);
    });

    it('returns true for tien_tri_hao_quang', () => {
        expect(isSeerRole('tien_tri_hao_quang')).toBe(true);
    });

    it('returns true for tien_tri_bi_an', () => {
        expect(isSeerRole('tien_tri_bi_an')).toBe(true);
    });

    it('returns false for dan_lang', () => {
        expect(isSeerRole('dan_lang')).toBe(false);
    });

    it('returns false for soi', () => {
        expect(isSeerRole('soi')).toBe(false);
    });

    it('returns false for ba_dong', () => {
        expect(isSeerRole('ba_dong')).toBe(false);
    });

    it('returns false for null', () => {
        expect(isSeerRole(null)).toBe(false);
    });
});

// ── getSeerScanResult ─────────────────────────────────────────────────────────

describe('getSeerScanResult', () => {
    it('returns WEREWOLF for soi', () => {
        expect(getSeerScanResult('soi')).toBe('WEREWOLF');
    });

    it('returns WEREWOLF for soi_con', () => {
        expect(getSeerScanResult('soi_con')).toBe('WEREWOLF');
    });

    it('returns VAMPIRE for ma_ca_rong', () => {
        expect(getSeerScanResult('ma_ca_rong')).toBe('VAMPIRE');
    });

    it('returns HUMAN for ba_dong (Medium must appear as human)', () => {
        expect(getSeerScanResult('ba_dong')).toBe('HUMAN');
    });

    it('returns HUMAN for muc_su', () => {
        expect(getSeerScanResult('muc_su')).toBe('HUMAN');
    });

    it('returns HUMAN for tien_tri investigating themselves', () => {
        expect(getSeerScanResult('tien_tri')).toBe('HUMAN');
    });

    it('returns HUMAN for ke_phan_boi (appears as villager per specialRules)', () => {
        expect(getSeerScanResult('ke_phan_boi')).toBe('HUMAN');
    });

    it('returns HUMAN for unknown / null roleId', () => {
        expect(getSeerScanResult(null)).toBe('HUMAN');
        expect(getSeerScanResult('unknown_role')).toBe('HUMAN');
    });
});

// ── appearsHumanToSeer ────────────────────────────────────────────────────────

describe('appearsHumanToSeer', () => {
    it('ba_dong appears human', () => {
        expect(appearsHumanToSeer('ba_dong')).toBe(true);
    });

    it('soi does NOT appear human', () => {
        expect(appearsHumanToSeer('soi')).toBe(false);
    });
});

// ── Medium scry correctness ───────────────────────────────────────────────────

describe('Medium scry – correctness logic', () => {
    /** Simplified scry function mirroring the store action logic */
    const simulateScry = (target: Player): { isCorrect: boolean } => ({
        isCorrect: target.isAlive && isSeerRole(target.roleId),
    });

    it('returns CORRECT when target is live Tiên Tri', () => {
        expect(simulateScry(makePlayer('tien_tri', true)).isCorrect).toBe(true);
    });

    it('returns INCORRECT when target is not Tiên Tri', () => {
        expect(simulateScry(makePlayer('dan_lang', true)).isCorrect).toBe(false);
    });

    it('returns INCORRECT when Tiên Tri is dead (seer dead rule)', () => {
        expect(simulateScry(makePlayer('tien_tri', false)).isCorrect).toBe(false);
    });

    it('returns INCORRECT when target is Sói', () => {
        expect(simulateScry(makePlayer('soi', true)).isCorrect).toBe(false);
    });

    it('returns INCORRECT when target is ba_dong itself', () => {
        expect(simulateScry(makePlayer('ba_dong', true)).isCorrect).toBe(false);
    });

    it('Medium can scry every night without restriction', () => {
        const seer = makePlayer('tien_tri', true);
        // Calling scry multiple times should always return consistently
        for (let i = 0; i < 5; i++) {
            expect(simulateScry(seer).isCorrect).toBe(true);
        }
    });
});
