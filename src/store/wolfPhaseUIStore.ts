import { create } from 'zustand';

interface WolfPhaseUIStore {
  step:            number;
  selectedTarget:  string | null;
  revengeTargets:  string[];
  votes:           Record<string, boolean>;

  setStep:         (n: number) => void;
  selectTarget:    (id: string) => void;
  toggleRevTarget: (id: string) => void;
  toggleVote:      (playerId: string) => void;
  reset:           () => void;

  // Helpers
  isVoteComplete:  (wolfCount: number) => boolean;
  isRevengeReady:  () => boolean;
}

export const useWolfPhaseUIStore = create<WolfPhaseUIStore>((set, get) => ({
  step: 0,
  selectedTarget: null,
  revengeTargets: [],
  votes: {},

  setStep: (n) => set({ step: n }),

  selectTarget: (id) => set({ selectedTarget: id }),

  toggleRevTarget: (id) => set(s => {
    const cur = s.revengeTargets;
    if (cur.includes(id)) return { revengeTargets: cur.filter(x => x !== id) };
    if (cur.length >= 2)  return s;  // max 2
    return { revengeTargets: [...cur, id] };
  }),

  toggleVote: (playerId) => set(s => ({
    votes: { ...s.votes, [playerId]: !s.votes[playerId] }
  })),

  reset: () => set({ step: 0, selectedTarget: null, revengeTargets: [], votes: {} }),

  isVoteComplete: (wolfCount) => {
    const v = get().votes;
    const votedCount = Object.values(v).filter(Boolean).length;
    // Note: Sói Con is pre-voted (true) in the UI logic, so we check if everyone in votes is true
    // Or if we specifically handle wolfCount.
    // According to the plan, Sói Con pre-voted = true.
    return votedCount === wolfCount;
  },

  isRevengeReady: () => get().revengeTargets.length === 2,
}));
