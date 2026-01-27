import { Player, Scenario, ScenarioRole, Role } from '../types';

/**
 * Randomly assign roles to players based on scenario
 */
export function assignRandomRoles(
    players: Player[],
    scenario: Scenario,
    availableRoles: Role[]
): Player[] {
    // Build role pool based on scenario
    const rolePool: string[] = [];
    scenario.roles.forEach((scenarioRole: ScenarioRole) => {
        for (let i = 0; i < scenarioRole.quantity; i++) {
            rolePool.push(scenarioRole.roleId);
        }
    });

    // Shuffle role pool using Fisher-Yates algorithm
    const shuffledRoles = shuffleArray([...rolePool]);

    // Assign roles to players
    return players.map((player, index) => ({
        ...player,
        roleId: shuffledRoles[index] || null,
    }));
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
