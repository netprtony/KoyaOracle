/**
 * PlayerStatus - Bitwise enum for efficient player state management
 * 
 * Uses bitwise flags to track multiple status conditions simultaneously.
 * This approach is more memory-efficient and allows for fast status checks
 * using bitwise operations.
 */

export enum PlayerStatus {
    NONE = 0,                    // 0b00000000000000000000

    // Core Status
    ALIVE = 1 << 0,              // 0b00000000000000000001

    // Night Action Effects
    BITTEN = 1 << 1,             // 0b00000000000000000010 - Targeted by werewolf
    PROTECTED = 1 << 2,          // 0b00000000000000000100 - Protected by guard
    HEALED = 1 << 3,             // 0b00000000000000001000 - Healed by witch
    POISONED = 1 << 4,           // 0b00000000000000010000 - Poisoned by witch
    BLESSED = 1 << 5,            // 0b00000000000000100000 - Blessed by priest (permanent night immunity)

    // Day Action Effects
    SILENCED = 1 << 6,           // 0b00000000000001000000 - Silenced by sorcerer
    EXILED = 1 << 7,             // 0b00000000000010000000 - Exiled by old woman

    // Relationship Status
    IS_LOVER = 1 << 8,           // 0b00000000000100000000 - Part of lovers pair
    IS_TWIN = 1 << 9,            // 0b00000000001000000000 - Part of twins pair
    IN_CULT = 1 << 10,           // 0b00000000010000000000 - Recruited by cult leader

    // Special States
    TRANSFORMED = 1 << 11,       // 0b00000000100000000000 - Transformed (e.g., Cursed -> Werewolf)
    MARKED_FOR_DEATH = 1 << 12,  // 0b00000001000000000000 - Delayed death (e.g., Tough Guy)
    INFECTED = 1 << 13,          // 0b00000010000000000000 - Werewolves infected by Diseased

    // Ability Usage Tracking
    USED_HEAL = 1 << 14,         // 0b00000100000000000000 - Witch used heal
    USED_POISON = 1 << 15,       // 0b00001000000000000000 - Witch used poison
    USED_BLESS = 1 << 16,        // 0b00010000000000000000 - Priest used blessing
    USED_SHOOT = 1 << 17,        // 0b00100000000000000000 - Female hunter used shot
    USED_INVESTIGATE = 1 << 18,  // 0b01000000000000000000 - Detective used investigation

    // Vote & Execution
    SURVIVED_EXECUTION = 1 << 19, // 0b10000000000000000000 - Prince survived execution
}

/**
 * Helper functions for bitwise operations on player status
 */

/**
 * Check if a player has a specific status
 * @param mask - Current status bitmask
 * @param status - Status to check
 * @returns true if the status flag is set
 */
export function hasStatus(mask: number, status: PlayerStatus): boolean {
    return (mask & status) !== 0;
}

/**
 * Add a status to the player's bitmask
 * @param mask - Current status bitmask
 * @param status - Status to add
 * @returns New bitmask with status added
 */
export function addStatus(mask: number, status: PlayerStatus): number {
    return mask | status;
}

/**
 * Remove a status from the player's bitmask
 * @param mask - Current status bitmask
 * @param status - Status to remove
 * @returns New bitmask with status removed
 */
export function removeStatus(mask: number, status: PlayerStatus): number {
    return mask & ~status;
}

/**
 * Toggle a status in the player's bitmask
 * @param mask - Current status bitmask
 * @param status - Status to toggle
 * @returns New bitmask with status toggled
 */
export function toggleStatus(mask: number, status: PlayerStatus): number {
    return mask ^ status;
}

/**
 * Check if player has any of the specified statuses
 * @param mask - Current status bitmask
 * @param statuses - Array of statuses to check
 * @returns true if any of the statuses are set
 */
export function hasAnyStatus(mask: number, statuses: PlayerStatus[]): boolean {
    return statuses.some(status => hasStatus(mask, status));
}

/**
 * Check if player has all of the specified statuses
 * @param mask - Current status bitmask
 * @param statuses - Array of statuses to check
 * @returns true if all of the statuses are set
 */
export function hasAllStatuses(mask: number, statuses: PlayerStatus[]): boolean {
    return statuses.every(status => hasStatus(mask, status));
}

/**
 * Clear all temporary night statuses (called at end of night resolution)
 * @param mask - Current status bitmask
 * @returns New bitmask with temporary statuses cleared
 */
export function clearNightStatuses(mask: number): number {
    const temporaryStatuses =
        PlayerStatus.BITTEN |
        PlayerStatus.PROTECTED |
        PlayerStatus.HEALED |
        PlayerStatus.POISONED;

    return mask & ~temporaryStatuses;
}

/**
 * Clear all temporary day statuses (called at end of day phase)
 * @param mask - Current status bitmask
 * @returns New bitmask with temporary statuses cleared
 */
export function clearDayStatuses(mask: number): number {
    const temporaryStatuses =
        PlayerStatus.SILENCED |
        PlayerStatus.EXILED;

    return mask & ~temporaryStatuses;
}

/**
 * Get human-readable status description
 * @param mask - Current status bitmask
 * @returns Array of status names
 */
export function getStatusNames(mask: number): string[] {
    const statuses: string[] = [];

    if (hasStatus(mask, PlayerStatus.ALIVE)) statuses.push('Alive');
    if (hasStatus(mask, PlayerStatus.BITTEN)) statuses.push('Bitten');
    if (hasStatus(mask, PlayerStatus.PROTECTED)) statuses.push('Protected');
    if (hasStatus(mask, PlayerStatus.HEALED)) statuses.push('Healed');
    if (hasStatus(mask, PlayerStatus.POISONED)) statuses.push('Poisoned');
    if (hasStatus(mask, PlayerStatus.BLESSED)) statuses.push('Blessed');
    if (hasStatus(mask, PlayerStatus.SILENCED)) statuses.push('Silenced');
    if (hasStatus(mask, PlayerStatus.EXILED)) statuses.push('Exiled');
    if (hasStatus(mask, PlayerStatus.IS_LOVER)) statuses.push('Lover');
    if (hasStatus(mask, PlayerStatus.IS_TWIN)) statuses.push('Twin');
    if (hasStatus(mask, PlayerStatus.IN_CULT)) statuses.push('In Cult');
    if (hasStatus(mask, PlayerStatus.TRANSFORMED)) statuses.push('Transformed');
    if (hasStatus(mask, PlayerStatus.MARKED_FOR_DEATH)) statuses.push('Marked for Death');
    if (hasStatus(mask, PlayerStatus.INFECTED)) statuses.push('Infected');

    return statuses;
}
