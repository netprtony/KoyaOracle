import { RoleId } from '../../assets/role-types';

export type NightRoleId = RoleId | 'wolf_pack';

export type NightWakeCondition = 'always' | 'night1_only' | 'conditional';

export interface NightRoleQueueItem {
  roleId: NightRoleId;
  playerId: string;
  playerName: string;
  priority: number;
  wakeCondition: NightWakeCondition;
  isActive: boolean;
  actionState: NightActionState | null;
}

interface NightActionMeta {
  confirmedAt?: number;
  isModified?: boolean;
}

export interface WolfKillAction extends NightActionMeta {
  type: 'WOLF_KILL';
  targetId: string;
  targetName: string;
  target2Id?: string;
  target2Name?: string;
  wolfCubVote: boolean;
}

export interface SeerScanAction extends NightActionMeta {
  type: 'SEER_SCAN';
  targetId: string;
  targetName: string;
  result: 'WOLF' | 'HUMAN';
}

export interface WitchAction extends NightActionMeta {
  type: 'WITCH';
  saveTargetId: string | null;
  poisonTargetId: string | null;
  usedSave: boolean;
  usedPoison: boolean;
}

export interface BodyguardAction extends NightActionMeta {
  type: 'BODYGUARD';
  targetId: string;
  targetName: string;
}

export interface PastorBlessAction extends NightActionMeta {
  type: 'PASTOR_BLESS';
  targetId: string;
  targetName: string;
}

export interface MediumScryAction extends NightActionMeta {
  type: 'MEDIUM_SCRY';
  targetId: string;
  targetName: string;
  isCorrect: boolean;
}

export interface RedRidingHoodRevealAction extends NightActionMeta {
  type: 'RED_RIDING_HOOD_REVEAL';
  wolfId: string;
  wolfName: string;
}

export interface CultRecruitAction extends NightActionMeta {
  type: 'CULT_RECRUIT';
  targetId: string;
  targetName: string;
}

export interface SkippedAction extends NightActionMeta {
  type: 'SKIPPED';
  reason: 'no_ability' | 'already_used' | 'player_skipped';
}

export type NightActionState =
  | WolfKillAction
  | SeerScanAction
  | WitchAction
  | BodyguardAction
  | PastorBlessAction
  | MediumScryAction
  | RedRidingHoodRevealAction
  | CultRecruitAction
  | SkippedAction;

export type NightActionMap = Record<string, NightActionState>;

export type WolfPhaseStep = 'wake' | 'members' | 'targets' | 'wolfcub_vote' | 'revenge';

export function getNightActionKey(roleId: NightRoleId, playerId: string): string {
  return `${roleId}:${playerId}`;
}
