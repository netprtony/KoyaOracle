/**
 * PlayerStateManager - Tracks enhanced player state during game
 * Manages status effects, relationships, and ability usage
 */

import { Team } from '../../assets/role-types';

export interface EnhancedPlayerState {
    playerId: string;
    roleId: string;
    team: Team;
    isAlive: boolean;

    // Status effects
    isProtected: boolean;
    isSilenced: boolean;
    isExiled: boolean;
    isBlessed: boolean;

    // Relationships
    isLovers: boolean;
    loverPartnerId?: string;
    isTwin: boolean;
    twinPartnerId?: string;
    isCultMember: boolean;
    isTraitor: boolean; // Kẻ Phản Bội

    // Targeting history (for restrictions)
    lastProtectedId?: string;
    lastSilencedId?: string;
    markedTargets: string[]; // Du Côn
    copyTargetId?: string; // Nhân Bản

    // Death and transformation
    markedForDeath: boolean;
    deathDelay: number; // Thanh Niên Cứng (0 = immediate, 1 = next night)
    hasTransformed: boolean; // Bị Nguyền
    originalRoleId?: string;
    killedBy?: string; // Track death cause for passive triggers

    // Werewolf status
    werewolvesInfected: boolean; // Người Bệnh effect
    werewolfKillBonus: number; // Sói Con revenge (kill 2 next night)

    // Ability usage tracking
    usedAbilities: Set<string>;

    // Vote weight
    voteWeight: number;
    canVote: boolean;
}

export interface PlayerInput {
    id: string;
    name: string;
    roleId: string;
    team: Team;
    position?: number;
}

export class PlayerStateManager {
    private states: Map<string, EnhancedPlayerState>;
    private playerOrder: string[]; // For adjacent player calculations

    constructor() {
        this.states = new Map();
        this.playerOrder = [];
    }

    /**
     * Initialize all player states
     */
    initializePlayers(players: PlayerInput[]): void {
        this.states.clear();
        this.playerOrder = [];

        players.forEach(player => {
            this.playerOrder.push(player.id);
            this.states.set(player.id, this.createInitialState(player));
        });
    }

    /**
     * Create initial state for a player
     */
    private createInitialState(player: PlayerInput): EnhancedPlayerState {
        return {
            playerId: player.id,
            roleId: player.roleId,
            team: player.team,
            isAlive: true,

            isProtected: false,
            isSilenced: false,
            isExiled: false,
            isBlessed: false,

            isLovers: false,
            isTwin: false,
            isCultMember: false,
            isTraitor: false,

            markedTargets: [],

            markedForDeath: false,
            deathDelay: 0,
            hasTransformed: false,

            werewolvesInfected: false,
            werewolfKillBonus: 0,

            usedAbilities: new Set(),

            voteWeight: 1,
            canVote: true,
        };
    }

    /**
     * Get player state
     */
    getState(playerId: string): EnhancedPlayerState | undefined {
        return this.states.get(playerId);
    }

    /**
     * Get all player states
     */
    getAllStates(): EnhancedPlayerState[] {
        return Array.from(this.states.values());
    }

    /**
     * Get alive players
     */
    getAlivePlayers(): EnhancedPlayerState[] {
        return this.getAllStates().filter(s => s.isAlive);
    }

    /**
     * Get players by team
     */
    getPlayersByTeam(team: Team): EnhancedPlayerState[] {
        return this.getAllStates().filter(s => s.team === team);
    }

    /**
     * Get alive players by team
     */
    getAlivePlayersByTeam(team: Team): EnhancedPlayerState[] {
        return this.getAlivePlayers().filter(s => s.team === team);
    }

    /**
     * Set protection status
     */
    setProtected(playerId: string, value: boolean): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isProtected = value;
        }
    }

    /**
     * Set blessed status (permanent night protection)
     */
    setBlessed(playerId: string, value: boolean): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isBlessed = value;
        }
    }

    /**
     * Set silenced status
     */
    setSilenced(playerId: string, value: boolean): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isSilenced = value;
        }
    }

    /**
     * Set exiled status
     */
    setExiled(playerId: string, value: boolean): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isExiled = value;
            state.canVote = !value;
        }
    }

    /**
     * Mark player for death
     */
    markForDeath(playerId: string, killedBy: string, delay: number = 0): void {
        const state = this.states.get(playerId);
        if (state) {
            state.markedForDeath = true;
            state.killedBy = killedBy;
            state.deathDelay = delay;
        }
    }

    /**
     * Kill player (set isAlive = false)
     */
    killPlayer(playerId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isAlive = false;
            state.markedForDeath = false;
        }
    }

    /**
     * Save player from death (Phù Thủy heal, Bảo Vệ)
     */
    saveFromDeath(playerId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.markedForDeath = false;
            state.killedBy = undefined;
        }
    }

    /**
     * Create lovers relationship
     */
    createLovers(playerId1: string, playerId2: string): void {
        const state1 = this.states.get(playerId1);
        const state2 = this.states.get(playerId2);

        if (state1 && state2) {
            state1.isLovers = true;
            state1.loverPartnerId = playerId2;
            state2.isLovers = true;
            state2.loverPartnerId = playerId1;
        }
    }

    /**
     * Create twins relationship
     */
    createTwins(playerId1: string, playerId2: string): void {
        const state1 = this.states.get(playerId1);
        const state2 = this.states.get(playerId2);

        if (state1 && state2) {
            state1.isTwin = true;
            state1.twinPartnerId = playerId2;
            state2.isTwin = true;
            state2.twinPartnerId = playerId1;
        }
    }

    /**
     * Add to cult
     */
    addToCult(playerId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.isCultMember = true;
        }
    }

    /**
     * Transform player (Bị Nguyền)
     */
    transformPlayer(playerId: string, newRoleId: string, newTeam: Team): void {
        const state = this.states.get(playerId);
        if (state) {
            state.originalRoleId = state.roleId;
            state.roleId = newRoleId;
            state.team = newTeam;
            state.hasTransformed = true;
        }
    }

    /**
     * Swap roles between two players
     */
    swapRoles(playerId1: string, playerId2: string): void {
        const state1 = this.states.get(playerId1);
        const state2 = this.states.get(playerId2);

        if (state1 && state2) {
            const tempRoleId = state1.roleId;
            const tempTeam = state1.team;

            state1.roleId = state2.roleId;
            state1.team = state2.team;

            state2.roleId = tempRoleId;
            state2.team = tempTeam;
        }
    }

    /**
     * Record used ability
     */
    useAbility(playerId: string, abilityId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.usedAbilities.add(abilityId);
        }
    }

    /**
     * Check if ability has been used
     */
    hasUsedAbility(playerId: string, abilityId: string): boolean {
        const state = this.states.get(playerId);
        return state?.usedAbilities.has(abilityId) ?? false;
    }

    /**
     * Set last protected target (for consecutive restriction)
     */
    setLastProtected(playerId: string, targetId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.lastProtectedId = targetId;
        }
    }

    /**
     * Set last silenced target (for consecutive restriction)
     */
    setLastSilenced(playerId: string, targetId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.lastSilencedId = targetId;
        }
    }

    /**
     * Get adjacent players (for Khủng Bố)
     */
    getAdjacentPlayers(playerId: string): string[] {
        const index = this.playerOrder.indexOf(playerId);
        if (index === -1) return [];

        const prev = index === 0
            ? this.playerOrder[this.playerOrder.length - 1]
            : this.playerOrder[index - 1];

        const next = index === this.playerOrder.length - 1
            ? this.playerOrder[0]
            : this.playerOrder[index + 1];

        return [prev, next].filter(id => {
            const state = this.states.get(id);
            return state?.isAlive;
        });
    }

    /**
     * Set vote weight (Thị Trưởng = 2)
     */
    setVoteWeight(playerId: string, weight: number): void {
        const state = this.states.get(playerId);
        if (state) {
            state.voteWeight = weight;
        }
    }

    /**
     * Reset night-only statuses at the start of each night
     */
    resetNightStatuses(): void {
        this.states.forEach(state => {
            state.isProtected = false; // Protection is per-night
            // Note: isBlessed is permanent, don't reset
            // Note: isSilenced lasts through next day, reset at end of day
        });
    }

    /**
     * Reset day statuses at the start of each day
     */
    resetDayStatuses(): void {
        this.states.forEach(state => {
            state.isSilenced = false;
            state.isExiled = false;
            state.canVote = true;
        });
    }

    /**
     * Process delayed deaths (Thanh Niên Cứng)
     */
    processDelayedDeaths(): string[] {
        const deadPlayers: string[] = [];

        this.states.forEach(state => {
            if (state.markedForDeath && state.deathDelay > 0) {
                state.deathDelay--;
                if (state.deathDelay === 0) {
                    state.isAlive = false;
                    state.markedForDeath = false;
                    deadPlayers.push(state.playerId);
                }
            }
        });

        return deadPlayers;
    }

    /**
     * Mark targets for Du Côn
     */
    setMarkedTargets(playerId: string, targetIds: string[]): void {
        const state = this.states.get(playerId);
        if (state) {
            state.markedTargets = targetIds;
        }
    }

    /**
     * Set copy target for Nhân Bản
     */
    setCopyTarget(playerId: string, targetId: string): void {
        const state = this.states.get(playerId);
        if (state) {
            state.copyTargetId = targetId;
        }
    }

    /**
     * Apply werewolf infection (Người Bệnh)
     */
    infectWerewolves(): void {
        this.states.forEach(state => {
            if (state.team === 'werewolf' && state.isAlive) {
                state.werewolvesInfected = true;
            }
        });
    }

    /**
     * Clear werewolf infection
     */
    clearWerewolfInfection(): void {
        this.states.forEach(state => {
            state.werewolvesInfected = false;
        });
    }

    /**
     * Set werewolf kill bonus (Sói Con revenge)
     */
    setWerewolfKillBonus(bonus: number): void {
        this.states.forEach(state => {
            if (state.team === 'werewolf') {
                state.werewolfKillBonus = bonus;
            }
        });
    }
}
