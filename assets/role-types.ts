// Types for Werewolf Game Roles

export type Team = 'villager' | 'werewolf' | 'vampire' | 'neutral';

export type SkillType =
  | 'protect'
  | 'bless'
  | 'createLovers'
  | 'kill'
  | 'recruit'
  | 'detectRole'
  | 'investigate'
  | 'heal'
  | 'silence'
  | 'exile'
  | 'copyRole'
  | 'swapRoles'
  | 'gamble'
  | 'markTargets'
  | 'dual'
  | 'none';

export type SkillFrequency =
  | 'everyNight'
  | 'oncePerGame'
  | 'firstNightOnly'
  | 'conditional';

export type PassiveSkillType =
  | 'linkedFate'
  | 'transformation'
  | 'revealRole'
  | 'revenge'
  | 'delayedDeath'
  | 'surviveExecution'
  | 'doubleVote'
  | 'falseIdentity'
  | 'explosionOnDeath'
  | 'diseaseCarrier'
  | 'autoKill'
  | 'hiddenAllegiance'
  | 'enablePower'
  | 'revengeKill';

export type InformationType =
  | 'team'
  | 'exactRole'
  | 'hasSpecialRole'
  | 'sameTeam'
  | 'targetOrAdjacentIsWerewolf';

export interface NightAction {
  type: SkillType;
  frequency: SkillFrequency;
  targetCount?: number;
  canTargetSelf?: boolean;
  cannotTargetSelf?: boolean;
  isGroupAction?: boolean;
  timeLimit?: number;
  restrictions?: string[];
  conditions?: string[];
  effect?: string;
  mandatory?: boolean;
  excludeFirstNight?: boolean;
  optional?: boolean;
  trigger?: string;
  requiresDeath?: string;
  detectTarget?: string;
  appearsAs?: string;
  information?: InformationType;
  duration?: string;
  cannotVote?: boolean;
  uses?: number;
  actions?: {
    type: SkillType;
    uses: number;
    targetCount: number;
  }[];
  method?: string;
}

export interface PassiveSkill {
  type: PassiveSkillType;
  trigger?: string;
  effect?: string;
  delay?: string;
  uses?: number;
  beneficiary?: string;
  appearsAs?: Team | string;
  retainsOriginalAbility?: boolean;
}

export interface AfterDeathSkill {
  type: string;
  frequency?: string;
  method?: string;
  restrictions?: string[];
}

export interface OnDeathSkill {
  type: string;
  effect: string;
}

export interface Skills {
  nightAction?: NightAction;
  passive?: PassiveSkill;
  specialAction?: NightAction;
  afterDeath?: AfterDeathSkill;
  onDeath?: OnDeathSkill;
}

export interface WinConditions {
  primary?: string;
  alternative?: string[];
  conditional?: {
    [key: string]: string;
  };
  criteria?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  team: Team;
  iconEmoji: string;
  icon?: string; // Legacy/UI mapped property
  skills: Skills;
  winConditions: WinConditions;
  specialRules?: string[];
  nightActionType?: 'selectTarget' | 'none' | string; // UI helper property
}

export type RoleId =
  | 'bao_ve' | 'muc_su' | 'than_tinh_yeu' | 'cap_doi'
  | 'soi' | 'soi_con' | 'soi_don_doc' | 'soi_an_chay' | 'nanh_soi' | 'soi_trum'
  | 'ba_dong' | 'ma_ca_rong' | 'ke_phan_boi' | 'bi_nguyen' | 'nhan_ban'
  | 'bom_nhau' | 'song_sinh' | 'chu_giao_phai' | 'khan_do' | 'ba_ngoai'
  | 'tho_san' | 'nu_tho_san' | 'phu_thuy' | 'phap_su' | 'mu_gia'
  | 'con_bac' | 'dan_lang' | 'thanh_nien_cung' | 'hoang_tu' | 'thi_truong'
  | 'con_lai' | 'khung_bo' | 'nguoi_benh' | 'hon_ma' | 'du_con'
  | 'ke_chan_doi' | 'tien_tri' | 'tien_tri_tap_su' | 'tien_tri_hao_quang'
  | 'tien_tri_bi_an' | 'nha_ngoai_cam' | 'tham_tu' | 'ke_pha_roi' | 'quan_tro';


