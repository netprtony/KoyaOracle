import { Role, Scenario, NightActionType, ScenarioRole } from '../types';
import rolesData from '../../assets/roles.json';
import scenariosData from '../../assets/KichBan.json';

// Define explicit types for the raw JSON to avoid 'any'
interface RawRole {
    id: string;
    name: string;
    description: string;
    team: string;
    iconEmoji: string;
}

interface RawScenario {
    kich_ban: number;
    so_nguoi_choi: number;
    chi_tiet_vai_tro: Record<string, number | undefined>;
    thu_tu_goi: {
        dem_1?: string[];
        dem_thuong?: string[];
    };
}

const ACTION_ROLES: Record<string, NightActionType> = {
    soi: 'selectTarget',
    soi_con: 'selectTarget',
    soi_don_doc: 'selectTarget',
    soi_an_chay: 'none', // Sói ăn chay không chọn
    nanh_soi: 'selectTarget', // Chỉ khi còn 1 mình
    soi_trum: 'selectTarget',
    tien_tri: 'selectTarget',
    bao_ve: 'selectTarget',
    phu_thuy: 'selectTarget',
    ba_dong: 'selectTarget',
    cupid: 'selectTarget',
    than_tinh_yeu: 'selectTarget',
    thoi_mien: 'selectTarget',
    nhan_ban: 'selectTarget',
    // Add others as needed, default to 'none'
};

/**
 * Load and adapt roles from local JSON asset
 */
export function loadRoles(): Role[] {
    const rawRoles = rolesData as RawRole[];

    return rawRoles.map(raw => ({
        id: raw.id,
        name: raw.name,
        icon: raw.iconEmoji,
        description: raw.description,
        nightActionType: ACTION_ROLES[raw.id] || 'none',
    }));
}

/**
 * Load and adapt scenarios from local JSON asset
 */
export function loadScenarios(): Scenario[] {
    const rawScenarios = scenariosData as RawScenario[];

    return rawScenarios.map(raw => {
        // Convert chi_tiet_vai_tro object to array
        // Cast to any to handle specific keys vs index signature mismatch from JSON
        const roles: ScenarioRole[] = Object.entries(raw.chi_tiet_vai_tro as any).map(([roleId, quantity]) => ({
            roleId,
            quantity: quantity as number
        }));

        // Start with "Kịch bản X" for name if no specific name provided
        // Wait, KichBan.json doesn't have names, just 'kich_ban' number.
        // We can generate a name.

        // We'll use 'dem_thuong' (normal night) for the sequence for now.
        // Ideally we handle night 1 vs normal night, but for MVP let's merge or just use normal night.
        // Actually, let's use a union of both, or just normal night order.
        // Most crucial roles appear in normal night. But Cupid only Night 1.
        // Let's use `dem_1` as it usually contains all roles that wake up.

        // De-duplicate roles in night order
        const nightOrder = Array.from(new Set([
            ...(raw.thu_tu_goi.dem_1 || []),
            ...(raw.thu_tu_goi.dem_thuong || [])
        ]));

        return {
            id: raw.kich_ban.toString(),
            name: `Kịch bản ${raw.kich_ban} (${raw.so_nguoi_choi} người)`,
            playerCount: raw.so_nguoi_choi,
            roles,
            nightOrder: {
                firstNight: raw.thu_tu_goi.dem_1 || [],
                otherNights: raw.thu_tu_goi.dem_thuong || []
            }
        };
    });
}

/**
 * Get role by ID
 */
export function getRoleById(roleId: string, roles: Role[]): Role | undefined {
    return roles.find((role) => role.id === roleId);
}

/**
 * Get scenario by ID
 */
export function getScenarioById(
    scenarioId: string,
    scenarios: Scenario[]
): Scenario | undefined {
    return scenarios.find((scenario) => scenario.id === scenarioId);
}
