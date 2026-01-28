/**
 * RoleManager - Manages role data from roles.json
 * Provides typed access to role information and skill lookup
 */

import { Role, Team, SkillType, NightAction, PassiveSkill, RoleId } from '../../assets/role-types';
import rolesData from '../../assets/roles.json';

export class RoleManager {
    private roles: Map<string, Role>;
    private rolesByTeam: Map<Team, Role[]>;
    private rolesWithNightAction: Map<SkillType, Role[]>;

    constructor() {
        this.roles = new Map();
        this.rolesByTeam = new Map();
        this.rolesWithNightAction = new Map();
        this.loadRoles();
    }

    /**
     * Load and index roles from JSON
     */
    private loadRoles(): void {
        const roles = rolesData as Role[];

        roles.forEach(role => {
            this.roles.set(role.id, role);

            // Index by team
            const teamRoles = this.rolesByTeam.get(role.team) || [];
            teamRoles.push(role);
            this.rolesByTeam.set(role.team, teamRoles);

            // Index by night action type
            if (role.skills?.nightAction) {
                const actionType = role.skills.nightAction.type;
                const actionRoles = this.rolesWithNightAction.get(actionType) || [];
                actionRoles.push(role);
                this.rolesWithNightAction.set(actionType, actionRoles);
            }
        });
    }

    /**
     * Get all roles
     */
    getAllRoles(): Role[] {
        return Array.from(this.roles.values());
    }

    /**
     * Get role by ID
     */
    getRoleById(id: string): Role | undefined {
        return this.roles.get(id);
    }

    /**
     * Get roles by team
     */
    getRolesByTeam(team: Team): Role[] {
        return this.rolesByTeam.get(team) || [];
    }

    /**
     * Get roles that have a specific night action type
     */
    getRolesWithNightAction(actionType: SkillType): Role[] {
        return this.rolesWithNightAction.get(actionType) || [];
    }

    /**
     * Check if a role has a night action
     */
    hasNightAction(roleId: string): boolean {
        const role = this.roles.get(roleId);
        return !!role?.skills?.nightAction;
    }

    /**
     * Get night action for a role
     */
    getNightAction(roleId: string): NightAction | undefined {
        const role = this.roles.get(roleId);
        return role?.skills?.nightAction;
    }

    /**
     * Check if a role has a passive skill
     */
    hasPassiveSkill(roleId: string): boolean {
        const role = this.roles.get(roleId);
        return !!role?.skills?.passive;
    }

    /**
     * Get passive skill for a role
     */
    getPassiveSkill(roleId: string): PassiveSkill | undefined {
        const role = this.roles.get(roleId);
        return role?.skills?.passive;
    }

    /**
     * Check if role can perform action based on frequency
     */
    canPerformAction(
        roleId: string,
        nightNumber: number,
        hasUsedAction: boolean
    ): boolean {
        const action = this.getNightAction(roleId);
        if (!action) return false;

        switch (action.frequency) {
            case 'everyNight':
                // Check excludeFirstNight (e.g., Con Bạc)
                if (action.excludeFirstNight && nightNumber === 1) {
                    return false;
                }
                return true;

            case 'firstNightOnly':
                return nightNumber === 1;

            case 'oncePerGame':
                return !hasUsedAction;

            case 'conditional':
                // Conditional actions need external state check
                return true;

            default:
                return false;
        }
    }

    /**
     * Get roles that are playable (exclude Quản Trò)
     */
    getPlayableRoles(): Role[] {
        return this.getAllRoles().filter(
            role => !role.specialRules?.includes('notPlayableRole')
        );
    }

    /**
     * Get roles that cannot be directly assigned (need special assignment)
     */
    getNonAssignableRoles(): Role[] {
        return this.getAllRoles().filter(
            role => role.specialRules?.includes('cannotBeDirectlyAssigned')
        );
    }

    /**
     * Check what a role appears as to a Seer
     */
    getAppearsAs(roleId: string): Team {
        const role = this.roles.get(roleId);
        if (!role) return 'villager';

        // Check passive skill for false identity
        const passive = role.skills?.passive;
        if (passive?.appearsAs) {
            return passive.appearsAs as Team;
        }

        // Check night action for appears as (Bà Đồng)
        const nightAction = role.skills?.nightAction;
        if (nightAction?.appearsAs) {
            return nightAction.appearsAs as Team;
        }

        return role.team;
    }

    /**
     * Get win condition for a role
     */
    getWinCondition(roleId: string): string | undefined {
        const role = this.roles.get(roleId);
        return role?.winConditions?.primary;
    }
}

// Singleton instance
let roleManagerInstance: RoleManager | null = null;

export function getRoleManager(): RoleManager {
    if (!roleManagerInstance) {
        roleManagerInstance = new RoleManager();
    }
    return roleManagerInstance;
}

// Reset for testing
export function resetRoleManager(): void {
    roleManagerInstance = null;
}
