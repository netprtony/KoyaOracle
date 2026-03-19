import { NightRoleId } from '../types/nightPhase.types';

export const REQUIRED_NIGHT_ACTIONS: NightRoleId[] = [
  'wolf_pack',
  'tien_tri',
  'khan_do',
];

export const OPTIONAL_NIGHT_ACTIONS: NightRoleId[] = [
  'phu_thuy',
  'bao_ve',
  'muc_su',
  'chu_giao_phai',
  'tham_tu',
  'du_con',
  'ke_chan_doi',
  'nhan_ban',
  'ba_ngoai',
  'con_lai',
  'hon_ma',
  'bi_nguyen',
];

export function isRequiredNightAction(roleId: NightRoleId): boolean {
  return REQUIRED_NIGHT_ACTIONS.includes(roleId);
}
