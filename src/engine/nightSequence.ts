import { Role, Scenario, ScenarioRole } from '../types';

/**
 * Get the night sequence of roles to call based on scenario
 * Only includes roles that are present in the scenario
 * Sorted by role.order
 */
export function getNightSequence(
    scenario: Scenario,
    availableRoles: Role[]
): Role[] {
    // Use the night order defined in the scenario
    const sequence: Role[] = [];

    // Filter roles that are actually in this scenario (quantity > 0)
    const activeRoleIds = new Set(
        scenario.roles
            .filter(r => r.quantity > 0)
            .map(r => r.roleId)
    );

    scenario.nightOrder.forEach((roleId) => {
        if (activeRoleIds.has(roleId)) {
            const role = availableRoles.find((r) => r.id === roleId);
            if (role) {
                sequence.push(role);
            }
        }
    });

    return sequence;
}

/**
 * Get the next role in the night sequence
 */
export function getNextRole(
    currentRoleId: string | null,
    nightSequence: Role[]
): Role | null {
    if (nightSequence.length === 0) return null;

    if (currentRoleId === null) {
        return nightSequence[0];
    }

    const currentIndex = nightSequence.findIndex(
        (role) => role.id === currentRoleId
    );

    if (currentIndex === -1 || currentIndex === nightSequence.length - 1) {
        return null; // End of sequence
    }

    return nightSequence[currentIndex + 1];
}

/**
 * Get the previous role in the night sequence
 */
export function getPreviousRole(
    currentRoleId: string | null,
    nightSequence: Role[]
): Role | null {
    if (nightSequence.length === 0 || currentRoleId === null) {
        return null;
    }

    const currentIndex = nightSequence.findIndex(
        (role) => role.id === currentRoleId
    );

    if (currentIndex <= 0) {
        return null; // Already at start
    }

    return nightSequence[currentIndex - 1];
}
