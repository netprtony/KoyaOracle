
export const SKILL_DISPLAY: Record<string, { icon: string; name: string; verb: string }> = {
    protect: { icon: '🛡️', name: 'Bảo vệ', verb: 'bảo vệ' },
    kill: { icon: '⚔️', name: 'Tấn công', verb: 'tấn công' },
    investigate: { icon: '🔍', name: 'Điều tra', verb: 'điều tra' },
    detectRole: { icon: '👁️', name: 'Phát hiện', verb: 'soi' },
    heal: { icon: '💊', name: 'Chữa trị', verb: 'chữa trị' },
    silence: { icon: '🤐', name: 'Phong ấn', verb: 'phong ấn' },
    bless: { icon: '✨', name: 'Ban phước', verb: 'ban phước' },
    createLovers: { icon: '💕', name: 'Se duyên', verb: 'se duyên cho' },
    recruit: { icon: '📿', name: 'Thu nạp', verb: 'thu nạp' },
    exile: { icon: '🚫', name: 'Trục xuất', verb: 'trục xuất' },
    copyRole: { icon: '🎭', name: 'Sao chép', verb: 'chọn sao chép' },
    swapRoles: { icon: '🔄', name: 'Hoán đổi', verb: 'hoán đổi vai trò' },
    markTargets: { icon: '🎯', name: 'Đánh dấu', verb: 'đánh dấu' },
    gamble: { icon: '🎲', name: 'Đánh cược', verb: 'đánh cược với' },
    dual: { icon: '⚗️', name: 'Kép', verb: 'hành động' },
    none: { icon: '💤', name: 'Không', verb: '' },
};

export const getSkillDisplay = (actionType: string) => {
    return SKILL_DISPLAY[actionType] || SKILL_DISPLAY.none;
};
