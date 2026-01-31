/**
 * PlayerStatus Unit Tests
 * 
 * Tests for bitwise status flag operations
 */

import {
    PlayerStatus,
    hasStatus,
    addStatus,
    removeStatus,
    toggleStatus,
    hasAnyStatus,
    hasAllStatuses,
    clearNightStatuses,
    clearDayStatuses,
    getStatusNames
} from '../PlayerStatus';

describe('PlayerStatus Bitmask Operations', () => {
    describe('hasStatus', () => {
        it('should detect single status flag', () => {
            const mask = PlayerStatus.ALIVE;
            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(false);
        });

        it('should detect multiple status flags', () => {
            const mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;
            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(false);
        });

        it('should handle NONE status', () => {
            const mask = PlayerStatus.NONE;
            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(false);
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(false);
        });
    });

    describe('addStatus', () => {
        it('should add single status flag', () => {
            let mask = PlayerStatus.ALIVE;
            mask = addStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
        });

        it('should be idempotent (adding same flag twice)', () => {
            let mask = PlayerStatus.ALIVE;
            mask = addStatus(mask, PlayerStatus.PROTECTED);
            mask = addStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
        });

        it('should add multiple different flags', () => {
            let mask = PlayerStatus.ALIVE;
            mask = addStatus(mask, PlayerStatus.BITTEN);
            mask = addStatus(mask, PlayerStatus.PROTECTED);
            mask = addStatus(mask, PlayerStatus.HEALED);

            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.HEALED)).toBe(true);
        });
    });

    describe('removeStatus', () => {
        it('should remove single status flag', () => {
            let mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;
            mask = removeStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(false);
        });

        it('should be idempotent (removing non-existent flag)', () => {
            let mask = PlayerStatus.ALIVE;
            mask = removeStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(false);
        });

        it('should remove specific flag without affecting others', () => {
            let mask = PlayerStatus.ALIVE | PlayerStatus.BITTEN | PlayerStatus.PROTECTED;
            mask = removeStatus(mask, PlayerStatus.BITTEN);

            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(false);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
        });
    });

    describe('toggleStatus', () => {
        it('should toggle status on', () => {
            let mask = PlayerStatus.ALIVE;
            mask = toggleStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(true);
        });

        it('should toggle status off', () => {
            let mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;
            mask = toggleStatus(mask, PlayerStatus.PROTECTED);

            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(false);
        });
    });

    describe('hasAnyStatus', () => {
        it('should return true if any status matches', () => {
            const mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;
            const result = hasAnyStatus(mask, [
                PlayerStatus.BITTEN,
                PlayerStatus.PROTECTED,
                PlayerStatus.HEALED
            ]);

            expect(result).toBe(true);
        });

        it('should return false if no status matches', () => {
            const mask = PlayerStatus.ALIVE;
            const result = hasAnyStatus(mask, [
                PlayerStatus.BITTEN,
                PlayerStatus.PROTECTED,
                PlayerStatus.HEALED
            ]);

            expect(result).toBe(false);
        });
    });

    describe('hasAllStatuses', () => {
        it('should return true if all statuses match', () => {
            const mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED | PlayerStatus.BLESSED;
            const result = hasAllStatuses(mask, [
                PlayerStatus.ALIVE,
                PlayerStatus.PROTECTED,
                PlayerStatus.BLESSED
            ]);

            expect(result).toBe(true);
        });

        it('should return false if any status is missing', () => {
            const mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;
            const result = hasAllStatuses(mask, [
                PlayerStatus.ALIVE,
                PlayerStatus.PROTECTED,
                PlayerStatus.BLESSED
            ]);

            expect(result).toBe(false);
        });
    });

    describe('clearNightStatuses', () => {
        it('should clear temporary night statuses', () => {
            let mask = PlayerStatus.ALIVE |
                PlayerStatus.BITTEN |
                PlayerStatus.PROTECTED |
                PlayerStatus.HEALED |
                PlayerStatus.BLESSED;

            mask = clearNightStatuses(mask);

            // Temporary statuses should be cleared
            expect(hasStatus(mask, PlayerStatus.BITTEN)).toBe(false);
            expect(hasStatus(mask, PlayerStatus.PROTECTED)).toBe(false);
            expect(hasStatus(mask, PlayerStatus.HEALED)).toBe(false);

            // Permanent statuses should remain
            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BLESSED)).toBe(true);
        });
    });

    describe('clearDayStatuses', () => {
        it('should clear temporary day statuses', () => {
            let mask = PlayerStatus.ALIVE |
                PlayerStatus.SILENCED |
                PlayerStatus.EXILED |
                PlayerStatus.BLESSED;

            mask = clearDayStatuses(mask);

            // Temporary statuses should be cleared
            expect(hasStatus(mask, PlayerStatus.SILENCED)).toBe(false);
            expect(hasStatus(mask, PlayerStatus.EXILED)).toBe(false);

            // Permanent statuses should remain
            expect(hasStatus(mask, PlayerStatus.ALIVE)).toBe(true);
            expect(hasStatus(mask, PlayerStatus.BLESSED)).toBe(true);
        });
    });

    describe('getStatusNames', () => {
        it('should return empty array for NONE', () => {
            const names = getStatusNames(PlayerStatus.NONE);
            expect(names).toEqual([]);
        });

        it('should return single status name', () => {
            const names = getStatusNames(PlayerStatus.ALIVE);
            expect(names).toContain('Alive');
            expect(names.length).toBe(1);
        });

        it('should return multiple status names', () => {
            const mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED | PlayerStatus.BLESSED;
            const names = getStatusNames(mask);

            expect(names).toContain('Alive');
            expect(names).toContain('Protected');
            expect(names).toContain('Blessed');
            expect(names.length).toBe(3);
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle werewolf attack with protection', () => {
            // Player is alive and protected
            let mask = PlayerStatus.ALIVE | PlayerStatus.PROTECTED;

            // Werewolf attacks (adds BITTEN)
            mask = addStatus(mask, PlayerStatus.BITTEN);

            // Check death condition: BITTEN && !PROTECTED = false (should survive)
            const shouldDie = hasStatus(mask, PlayerStatus.BITTEN) &&
                !hasStatus(mask, PlayerStatus.PROTECTED);

            expect(shouldDie).toBe(false);
        });

        it('should handle werewolf attack without protection', () => {
            // Player is alive
            let mask = PlayerStatus.ALIVE;

            // Werewolf attacks (adds BITTEN)
            mask = addStatus(mask, PlayerStatus.BITTEN);

            // Check death condition: BITTEN && !PROTECTED = true (should die)
            const shouldDie = hasStatus(mask, PlayerStatus.BITTEN) &&
                !hasStatus(mask, PlayerStatus.PROTECTED) &&
                !hasStatus(mask, PlayerStatus.HEALED);

            expect(shouldDie).toBe(true);
        });

        it('should handle witch heal saving player', () => {
            // Player is alive and bitten
            let mask = PlayerStatus.ALIVE | PlayerStatus.BITTEN;

            // Witch heals
            mask = addStatus(mask, PlayerStatus.HEALED);

            // Check death condition: BITTEN && !HEALED = false (should survive)
            const shouldDie = hasStatus(mask, PlayerStatus.BITTEN) &&
                !hasStatus(mask, PlayerStatus.PROTECTED) &&
                !hasStatus(mask, PlayerStatus.HEALED);

            expect(shouldDie).toBe(false);
        });
    });
});
