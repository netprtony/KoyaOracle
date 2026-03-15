/**
 * SeerScanLogic – Alignment mask for Seer (Tiên Tri) investigation results.
 *
 * Some roles deliberately appear as HUMAN (villager alignment) to the Seer
 * regardless of their true team, e.g. Bà Đồng, Mục Sư, Thợ Săn, Ma Sói…
 */

import { BewitchedState } from '../../types';

export type ScanAlignment = 'HUMAN' | 'WEREWOLF' | 'VAMPIRE' | 'NEUTRAL';

/**
 * Roles that always appear as HUMAN when investigated by the Seer.
 * Extend this list when new roles with `appearsAsVillagerToSeer` need adding.
 */
export const HUMAN_MASK_ROLE_IDS: ReadonlySet<string> = new Set([
    'ba_dong',       // Bà Đồng – explicitly stated in specialRules
    'muc_su',        // Mục Sư  – phe Làng
    'tho_san',       // Thợ Săn
    'phap_su',       // Pháp Sư / Witch
    'tien_tri',      // Tiên Tri (soi bản thân → HUMAN)
    'tien_tri_tap_su',
    'tien_tri_hao_quang',
    'tien_tri_bi_an',
    'bao_ve',        // Bảo Vệ
    'cap_doi',       // Cặp Đôi – depends on partner; default HUMAN
    'than_tinh_yeu', // Thần Tình Yêu
    'ke_phan_boi',   // Kẻ Phản Bội – specially appears as HUMAN per specialRules
    // bi_quyen is handled dynamically by state (see getSeerScanResultForPlayer)
]);

/** Role ids that appear as WEREWOLF when scanned */
export const WEREWOLF_SCAN_IDS: ReadonlySet<string> = new Set([
    'soi',
    'soi_con',
    'soi_don_doc',
    'soi_an_chay',
    'ma_soi',        // keep if defined
    'con_lai',        // Con Lai – appears as WEREWOLF to Seer
]);

/** Role ids that appear as VAMPIRE when scanned */
export const VAMPIRE_SCAN_IDS: ReadonlySet<string> = new Set([
    'ma_ca_rong',
]);

/**
 * Return the alignment that the Seer sees when they investigate a role.
 *
 * @param roleId - The true roleId of the player being investigated.
 *                 Pass `null` if role is unknown (Physical Card mode).
 * @returns 'HUMAN' | 'WEREWOLF' | 'VAMPIRE' | 'NEUTRAL'
 */
export function getSeerScanResult(roleId: string | null): ScanAlignment {
    if (roleId === null) return 'HUMAN'; // Unknown role – default safe result

    // Bị Quyến pre-transformation → always HUMAN via roleId alone
    // (dynamic state is handled in getSeerScanResultForPlayer)
    if (roleId === 'bi_quyen') return 'HUMAN';

    if (HUMAN_MASK_ROLE_IDS.has(roleId)) return 'HUMAN';
    if (WEREWOLF_SCAN_IDS.has(roleId))   return 'WEREWOLF';
    if (VAMPIRE_SCAN_IDS.has(roleId))    return 'VAMPIRE';

    // Everything else (neutrals, special roles) → HUMAN
    return 'HUMAN';
}

/**
 * Dynamic seer scan that takes the player's runtime bewitched state into account.
 * Use this when a full player object (with `bewitchedState`) is available.
 */
export function getSeerScanResultForPlayer(
    roleId: string | null,
    bewitchedState?: BewitchedState | null,
    isTraitor?: boolean
): ScanAlignment {
    // Traitor always appears as HUMAN to the seer
    if (isTraitor) return 'HUMAN';

    // Bị Quyến – result depends on transformation state
    if (roleId === 'bi_quyen') {
        switch (bewitchedState) {
            case 'WOLF':               return 'WEREWOLF';
            case 'TRANSFORMING_WOLF':  return 'HUMAN'; // not yet transformed
            case 'VAMPIRE':            return 'VAMPIRE';
            case 'TRANSFORMING_VAMPIRE': return 'HUMAN';
            default:                   return 'HUMAN';
        }
    }

    return getSeerScanResult(roleId);
}

/**
 * Convenience: check if a role appears as HUMAN to the Seer.
 */
export function appearsHumanToSeer(roleId: string | null): boolean {
    return getSeerScanResult(roleId) === 'HUMAN';
}

/**
 * Check if a player is a Seer variant (used by Medium logic).
 * Covers base Tiên Tri and apprentice/halo/secret variants.
 */
export function isSeerRole(roleId: string | null): boolean {
    if (roleId === null) return false;
    return (
        roleId === 'tien_tri' ||
        roleId === 'tien_tri_tap_su' ||
        roleId === 'tien_tri_hao_quang' ||
        roleId === 'tien_tri_bi_an'
    );
}

