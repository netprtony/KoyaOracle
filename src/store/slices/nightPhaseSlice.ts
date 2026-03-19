import { create } from 'zustand';
import { Role, Scenario, NightOrderDefinition, GameSession } from '../../types';
import { initNightQueue } from '../../engine/nightSequence';
import {
  NightRoleQueueItem,
  NightActionState,
  NightActionMap,
  NightRoleId,
  WolfPhaseStep,
  getNightActionKey,
} from '../../types/nightPhase.types';
import { isRequiredNightAction } from '../../constants/nightRoleConfig';

function withActionMeta(action: NightActionState, isModified: boolean): NightActionState {
  return {
    ...action,
    confirmedAt: Date.now(),
    isModified,
  };
}

function computeNightResolveReady(queue: NightRoleQueueItem[], actionMap: NightActionMap): boolean {
  const requiredActive = queue.filter(item => item.isActive && isRequiredNightAction(item.roleId));
  return requiredActive.every(item => {
    const key = getNightActionKey(item.roleId, item.playerId);
    return !!actionMap[key];
  });
}

export interface NightPhaseState {
  nightQueue: NightRoleQueueItem[];
  nightCurrentIndex: number;
  nightQueueVisible: boolean;
  nightActionMap: NightActionMap;
  nightResolveReady: boolean;
  wolfPhaseStep: WolfPhaseStep;

  initNightQueue: (params: {
    scenario: Scenario;
    availableRoles: Role[];
    nightNumber: number;
    session: GameSession;
    sessionOverrideOrder?: NightOrderDefinition;
  }) => void;
  setNightAction: (roleId: NightRoleId, playerId: string, action: NightActionState) => void;
  getNightAction: (roleId: NightRoleId, playerId: string) => NightActionState | null;
  clearNightAction: (roleId: NightRoleId, playerId: string) => void;
  clearAllNightActions: () => void;
  goNextNightRole: () => void;
  goPrevNightRole: () => void;
  jumpToNightRole: (index: number) => void;
  setWolfPhaseStep: (step: WolfPhaseStep) => void;
  toggleQueueDrawer: () => void;
  clearNightSession: () => void;
}

export const useNightPhaseStore = create<NightPhaseState>((set, get) => ({
  nightQueue: [],
  nightCurrentIndex: 0,
  nightQueueVisible: false,
  nightActionMap: {},
  nightResolveReady: false,
  wolfPhaseStep: 'wake',

  initNightQueue: ({ scenario, availableRoles, nightNumber, session, sessionOverrideOrder }) => {
    const queue = initNightQueue(scenario, availableRoles, nightNumber, session, sessionOverrideOrder);
    set({
      nightQueue: queue,
      nightCurrentIndex: 0,
      nightQueueVisible: false,
      nightActionMap: {},
      nightResolveReady: false,
      wolfPhaseStep: 'wake',
    });
  },

  setNightAction: (roleId, playerId, action) => {
    const key = getNightActionKey(roleId, playerId);
    const previous = get().nightActionMap[key];

    set(state => {
      const nextActionMap = {
        ...state.nightActionMap,
        [key]: withActionMeta(action, !!previous),
      };
      return {
        nightActionMap: nextActionMap,
        nightResolveReady: computeNightResolveReady(state.nightQueue, nextActionMap),
      };
    });
  },

  getNightAction: (roleId, playerId) => {
    const key = getNightActionKey(roleId, playerId);
    return get().nightActionMap[key] || null;
  },

  clearNightAction: (roleId, playerId) => {
    const key = getNightActionKey(roleId, playerId);
    set(state => {
      const nextActionMap = { ...state.nightActionMap };
      delete nextActionMap[key];
      return {
        nightActionMap: nextActionMap,
        nightResolveReady: computeNightResolveReady(state.nightQueue, nextActionMap),
      };
    });
  },

  clearAllNightActions: () => {
    set(state => ({
      nightActionMap: {},
      nightResolveReady: computeNightResolveReady(state.nightQueue, {}),
    }));
  },

  goNextNightRole: () => {
    set(state => ({
      nightCurrentIndex: Math.min(state.nightCurrentIndex + 1, Math.max(0, state.nightQueue.length - 1)),
    }));
  },

  goPrevNightRole: () => {
    set(state => ({
      nightCurrentIndex: Math.max(state.nightCurrentIndex - 1, 0),
    }));
  },

  jumpToNightRole: (index) => {
    set(state => ({
      nightCurrentIndex: Math.max(0, Math.min(index, Math.max(0, state.nightQueue.length - 1))),
      nightQueueVisible: false,
    }));
  },

  setWolfPhaseStep: (step) => {
    set({ wolfPhaseStep: step });
  },

  toggleQueueDrawer: () => {
    set(state => ({ nightQueueVisible: !state.nightQueueVisible }));
  },

  clearNightSession: () => {
    set({
      nightQueue: [],
      nightCurrentIndex: 0,
      nightQueueVisible: false,
      nightActionMap: {},
      nightResolveReady: false,
      wolfPhaseStep: 'wake',
    });
  },
}));
