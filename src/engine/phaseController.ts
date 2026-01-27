import { Phase, PhaseType } from '../types';

/**
 * Create initial phase (Night 1)
 */
export function createInitialPhase(): Phase {
    return {
        type: 'NIGHT',
        number: 1,
    };
}

/**
 * Advance from night to day
 */
export function advanceToDay(currentPhase: Phase): Phase {
    return {
        type: 'DAY',
        number: currentPhase.number,
    };
}

/**
 * Advance from day to next night
 */
export function advanceToNight(currentPhase: Phase): Phase {
    return {
        type: 'NIGHT',
        number: currentPhase.number + 1,
    };
}

/**
 * Get phase display string (e.g., "Night 1", "Day 2")
 */
export function getPhaseDisplay(phase: Phase): string {
    const phaseType = phase.type === 'NIGHT' ? 'Đêm' : 'Ngày';
    return `${phaseType} ${phase.number}`;
}
