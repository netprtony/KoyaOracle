/**
 * RoleManager Tests
 */

import { RoleManager, getRoleManager, resetRoleManager } from '../RoleManager';

describe('RoleManager', () => {
    let roleManager: RoleManager;

    beforeEach(() => {
        resetRoleManager();
        roleManager = getRoleManager();
    });

    describe('getAllRoles', () => {
        it('should load all roles from JSON', () => {
            const roles = roleManager.getAllRoles();
            expect(roles.length).toBeGreaterThan(40); // 42 roles in roles.json
        });

        it('should not include duplicate role IDs', () => {
            const roles = roleManager.getAllRoles();
            const ids = roles.map(r => r.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });
    });

    describe('getRoleById', () => {
        it('should return role by ID', () => {
            const role = roleManager.getRoleById('soi');
            expect(role).toBeDefined();
            expect(role?.name).toBe('Sói');
            expect(role?.team).toBe('werewolf');
        });

        it('should return undefined for non-existent role', () => {
            const role = roleManager.getRoleById('non_existent');
            expect(role).toBeUndefined();
        });
    });

    describe('getRolesByTeam', () => {
        it('should return all werewolf roles', () => {
            const werewolves = roleManager.getRolesByTeam('werewolf');
            expect(werewolves.length).toBeGreaterThan(5);
            expect(werewolves.every(r => r.team === 'werewolf')).toBe(true);
        });

        it('should return all villager roles', () => {
            const villagers = roleManager.getRolesByTeam('villager');
            expect(villagers.length).toBeGreaterThan(10);
            expect(villagers.every(r => r.team === 'villager')).toBe(true);
        });

        it('should return empty array for team with no roles', () => {
            const roles = roleManager.getRolesByTeam('unknown' as any);
            expect(roles).toEqual([]);
        });
    });

    describe('getRolesWithNightAction', () => {
        it('should return roles with kill action', () => {
            const killers = roleManager.getRolesWithNightAction('kill');
            expect(killers.length).toBeGreaterThan(3);
            expect(killers.some(r => r.id === 'soi')).toBe(true);
            expect(killers.some(r => r.id === 'nu_tho_san')).toBe(true);
        });

        it('should return roles with investigate action', () => {
            const investigators = roleManager.getRolesWithNightAction('investigate');
            expect(investigators.some(r => r.id === 'tien_tri')).toBe(true);
            expect(investigators.some(r => r.id === 'tien_tri_bi_an')).toBe(true);
        });

        it('should return roles with protect action', () => {
            const protectors = roleManager.getRolesWithNightAction('protect');
            expect(protectors.some(r => r.id === 'bao_ve')).toBe(true);
        });
    });

    describe('hasNightAction', () => {
        it('should return true for role with night action', () => {
            expect(roleManager.hasNightAction('soi')).toBe(true);
            expect(roleManager.hasNightAction('tien_tri')).toBe(true);
            expect(roleManager.hasNightAction('bao_ve')).toBe(true);
        });

        it('should return false for role without night action', () => {
            expect(roleManager.hasNightAction('dan_lang')).toBe(false);
            expect(roleManager.hasNightAction('ke_chan_doi')).toBe(false);
        });
    });

    describe('getNightAction', () => {
        it('should return night action details', () => {
            const action = roleManager.getNightAction('bao_ve');
            expect(action).toBeDefined();
            expect(action?.type).toBe('protect');
            expect(action?.frequency).toBe('everyNight');
            expect(action?.targetCount).toBe(1);
        });

        it('should return undefined for role without night action', () => {
            const action = roleManager.getNightAction('dan_lang');
            expect(action).toBeUndefined();
        });
    });

    describe('hasPassiveSkill', () => {
        it('should return true for role with passive skill', () => {
            expect(roleManager.hasPassiveSkill('tho_san')).toBe(true); // revengeKill
            expect(roleManager.hasPassiveSkill('bi_nguyen')).toBe(true); // transformation
            expect(roleManager.hasPassiveSkill('khung_bo')).toBe(true); // explosionOnDeath
        });

        it('should return false for role without passive skill', () => {
            expect(roleManager.hasPassiveSkill('soi')).toBe(false);
            expect(roleManager.hasPassiveSkill('tien_tri')).toBe(false);
        });
    });

    describe('canPerformAction', () => {
        it('should allow everyNight actions on any night', () => {
            expect(roleManager.canPerformAction('soi', 1, false)).toBe(true);
            expect(roleManager.canPerformAction('soi', 5, false)).toBe(true);
        });

        it('should only allow firstNightOnly on night 1', () => {
            expect(roleManager.canPerformAction('than_tinh_yeu', 1, false)).toBe(true);
            expect(roleManager.canPerformAction('than_tinh_yeu', 2, false)).toBe(false);
        });

        it('should prevent oncePerGame after used', () => {
            expect(roleManager.canPerformAction('muc_su', 1, false)).toBe(true);
            expect(roleManager.canPerformAction('muc_su', 2, true)).toBe(false);
        });

        it('should exclude first night for Con Bạc', () => {
            expect(roleManager.canPerformAction('con_bac', 1, false)).toBe(false);
            expect(roleManager.canPerformAction('con_bac', 2, false)).toBe(true);
        });
    });

    describe('getPlayableRoles', () => {
        it('should exclude Quản Trò', () => {
            const playable = roleManager.getPlayableRoles();
            expect(playable.some(r => r.id === 'quan_tro')).toBe(false);
        });

        it('should include most roles', () => {
            const playable = roleManager.getPlayableRoles();
            expect(playable.some(r => r.id === 'soi')).toBe(true);
            expect(playable.some(r => r.id === 'tien_tri')).toBe(true);
        });
    });

    describe('getAppearsAs', () => {
        it('should return actual team for normal roles', () => {
            expect(roleManager.getAppearsAs('soi')).toBe('werewolf');
            expect(roleManager.getAppearsAs('tien_tri')).toBe('villager');
        });

        it('should return werewolf for Con Lai', () => {
            expect(roleManager.getAppearsAs('con_lai')).toBe('werewolf');
        });

        it('should return villager for Bà Đồng', () => {
            expect(roleManager.getAppearsAs('ba_dong')).toBe('villager');
        });
    });

    describe('getWinCondition', () => {
        it('should return villagerTeamWins for villagers', () => {
            expect(roleManager.getWinCondition('bao_ve')).toBe('villagerTeamWins');
            expect(roleManager.getWinCondition('tien_tri')).toBe('villagerTeamWins');
        });

        it('should return werewolfTeamWins for werewolves', () => {
            expect(roleManager.getWinCondition('soi')).toBe('werewolfTeamWins');
        });

        it('should return special win conditions', () => {
            expect(roleManager.getWinCondition('ke_chan_doi')).toBe('dieByExecution');
            expect(roleManager.getWinCondition('du_con')).toBe('targetsDeadAndSelfAlive');
        });
    });

    describe('singleton behavior', () => {
        it('should return same instance', () => {
            const instance1 = getRoleManager();
            const instance2 = getRoleManager();
            expect(instance1).toBe(instance2);
        });

        it('should reset correctly', () => {
            const instance1 = getRoleManager();
            resetRoleManager();
            const instance2 = getRoleManager();
            expect(instance1).not.toBe(instance2);
        });
    });
});
