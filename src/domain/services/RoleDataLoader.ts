/**
 * RoleDataLoader - Service for loading role and scenario data from JSON
 * 
 * Provides access to roles.json and KichBan.json data with caching.
 */

import { Role } from '../../../assets/role-types';
import { loadRoles, loadScenarios } from '../../utils/assetLoader';

export interface Scenario {
    kich_ban: number;
    so_nguoi_choi: number;
    chi_tiet_vai_tro: Record<string, number>;
    thu_tu_goi: {
        dem_1: string[];
        dem_thuong: string[];
    };
}

export class RoleDataLoader {
    private rolesCache: Role[] | null = null;
    private scenariosCache: Scenario[] | null = null;

    /**
     * Load all roles from roles.json
     */
    loadRoles(): Role[] {
        if (!this.rolesCache) {
            this.rolesCache = loadRoles();
        }
        return this.rolesCache || [];
    }

    /**
     * Load all scenarios from KichBan.json
     */
    loadScenarios(): Scenario[] {
        if (!this.scenariosCache) {
            const loaded = loadScenarios() as any;
            this.scenariosCache = loaded || [];
        }
        return this.scenariosCache || [];
    }

    /**
     * Get role by ID
     */
    getRoleById(roleId: string): Role | undefined {
        return this.loadRoles().find(r => r.id === roleId);
    }

    /**
     * Get scenario by ID
     */
    getScenarioById(scenarioId: number): Scenario | undefined {
        return this.loadScenarios().find(s => s.kich_ban === scenarioId);
    }

    /**
     * Get night order for a scenario
     * @param scenarioId - Scenario ID (kich_ban number)
     * @param nightNumber - Night number (1 for first night, >1 for regular nights)
     */
    getNightOrder(scenarioId: number, nightNumber: number): string[] {
        const scenario = this.getScenarioById(scenarioId);

        if (!scenario) {
            console.warn(`Scenario ${scenarioId} not found`);
            return [];
        }

        // First night uses dem_1, subsequent nights use dem_thuong
        return nightNumber === 1
            ? scenario.thu_tu_goi.dem_1
            : scenario.thu_tu_goi.dem_thuong;
    }

    /**
     * Get roles for a scenario
     */
    getScenarioRoles(scenarioId: number): { roleId: string; count: number }[] {
        const scenario = this.getScenarioById(scenarioId);

        if (!scenario) {
            return [];
        }

        return Object.entries(scenario.chi_tiet_vai_tro).map(([roleId, count]) => ({
            roleId,
            count
        }));
    }

    /**
     * Clear cache (for testing or reloading)
     */
    clearCache(): void {
        this.rolesCache = null;
        this.scenariosCache = null;
    }
}

// Singleton instance
let loaderInstance: RoleDataLoader | null = null;

/**
 * Get singleton role data loader instance
 */
export function getRoleDataLoader(): RoleDataLoader {
    if (!loaderInstance) {
        loaderInstance = new RoleDataLoader();
    }
    return loaderInstance;
}

// Note: resetRoleDataLoader() removed as it was unused throughout the codebase.
// The singleton pattern is sufficient for production use.
