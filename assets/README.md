# Cấu trúc Roles JSON đã được Chuẩn hóa

## Tổng quan

File `roles_normalized.json` đã được cấu trúc lại để dễ dàng lập trình logic game Ma Sói với các thuộc tính rõ ràng cho skills, điều kiện thắng/thua, và quy tắc đặc biệt.

## Cấu trúc chính của một Role

```typescript
{
  "id": string,              // ID duy nhất
  "name": string,            // Tên hiển thị
  "description": string,     // Mô tả chi tiết
  "team": Team,              // "villager" | "werewolf" | "vampire" | "neutral"
  "iconEmoji": string,       // Icon emoji
  "skills": Skills,          // Các kỹ năng
  "winConditions": WinConditions,  // Điều kiện thắng
  "specialRules": string[]   // Quy tắc đặc biệt (optional)
}
```

## 1. Skills Object

### 1.1 Night Action (Hành động ban đêm)
```typescript
"nightAction": {
  "type": string,              // Loại hành động: "protect", "kill", "investigate", etc.
  "frequency": string,         // "everyNight", "oncePerGame", "firstNightOnly", "conditional"
  "targetCount": number,       // Số mục tiêu có thể chọn
  "canTargetSelf": boolean,    // Có thể chọn chính mình
  "isGroupAction": boolean,    // Hành động nhóm (như Sói)
  "timeLimit": number,         // Giới hạn thời gian (giây)
  "restrictions": string[],    // Các hạn chế
  "effect": string,            // Hiệu ứng đặc biệt
  "information": string        // Loại thông tin nhận được (cho roles điều tra)
}
```

**Các loại Night Action:**
- `protect`: Bảo vệ người chơi
- `kill`: Giết người chơi
- `investigate`: Điều tra thân phận
- `detectRole`: Phát hiện vai trò cụ thể
- `heal`: Cứu người
- `silence`: Làm câm
- `exile`: Trục xuất
- `recruit`: Kết nạp
- `copyRole`: Sao chép vai trò
- `swapRoles`: Tráo đổi vai trò
- `gamble`: Đánh cược
- `markTargets`: Đánh dấu mục tiêu
- `bless`: Ban phước
- `createLovers`: Tạo cặp đôi
- `dual`: Hành động kép (như Phù Thủy)

### 1.2 Passive Skill (Kỹ năng bị động)
```typescript
"passive": {
  "type": string,              // Loại passive skill
  "trigger": string,           // Điều kiện kích hoạt
  "effect": string,            // Hiệu ứng
  "delay": string,             // Độ trễ (nếu có)
  "uses": number,              // Số lần sử dụng
  "appearsAs": string          // Xuất hiện như thế nào với Tiên Tri
}
```

**Các loại Passive Skill:**
- `linkedFate`: Liên kết số phận (Cặp Đôi, Song Sinh)
- `transformation`: Biến đổi (Bị Nguyền)
- `revenge`: Trả thù (Sói Con)
- `delayedDeath`: Chết trễ (Thanh Niên Cứng)
- `surviveExecution`: Sống sót khi treo cổ (Hoàng Tử)
- `doubleVote`: Vote gấp đôi (Thị Trưởng)
- `falseIdentity`: Danh tính giả (Con Lai)
- `explosionOnDeath`: Nổ khi chết (Khủng Bố)
- `diseaseCarrier`: Mang bệnh (Người Bệnh)
- `revengeKill`: Giết trả thù (Thợ Săn)

### 1.3 Special Action (Hành động đặc biệt)
Tương tự nightAction nhưng dành cho các hành động không theo chu kỳ đêm thường.

### 1.4 After Death / On Death
```typescript
"afterDeath": {
  "type": string,
  "frequency": string,
  "method": string
}

"onDeath": {
  "type": string,
  "effect": string
}
```

## 2. Win Conditions

### 2.1 Win Condition đơn giản
```json
"winConditions": {
  "primary": "villagerTeamWins"
}
```

### 2.2 Win Condition với điều kiện thay thế
```json
"winConditions": {
  "primary": "villagerTeamWins",
  "alternative": ["loversWin"]
}
```

### 2.3 Win Condition có điều kiện
```json
"winConditions": {
  "conditional": {
    "sameTeam": "originalTeamWins",
    "differentTeam": "beLastTwoSurvivors"
  }
}
```

### 2.4 Win Condition với tiêu chí cụ thể
```json
"winConditions": {
  "primary": "werewolfTeamWins",
  "criteria": "eliminateAllVillagersAndThirdParty"
}
```

**Các loại Win Condition phổ biến:**
- `villagerTeamWins`: Phe Dân Làng thắng
- `werewolfTeamWins`: Phe Sói thắng
- `vampireTeamWins`: Phe Ma Cà Rồng thắng
- `loversWin`: Cặp Đôi thắng
- `beLastTwoSurvivors`: Là 2 người sống sót cuối cùng
- `beLastWerewolfAlive`: Là con Sói cuối cùng còn sống
- `allAliveBelongToCult`: Tất cả người sống thuộc giáo phái
- `targetsDeadAndSelfAlive`: Mục tiêu chết và bản thân sống
- `dieByExecution`: Chết bởi treo cổ
- `surviveAndFindWerewolves`: Sống sót và tìm Sói

## 3. Special Rules

Mảng các quy tắc đặc biệt không thể biểu diễn qua skills thông thường:
```json
"specialRules": [
  "retainsOriginalRole",
  "cannotBeDirectlyAssigned",
  "poweredByGrandmotherDeath",
  "cannotMentionTwinRelationship"
]
```

## 4. Ví dụ Roles phức tạp

### 4.1 Bảo Vệ (Role với hạn chế)
```json
{
  "id": "bao_ve",
  "skills": {
    "nightAction": {
      "type": "protect",
      "frequency": "everyNight",
      "targetCount": 1,
      "canTargetSelf": true,
      "restrictions": ["cannotTargetSamePersonConsecutively"]
    }
  }
}
```

### 4.2 Phù Thủy (Role với nhiều hành động)
```json
{
  "id": "phu_thuy",
  "skills": {
    "nightAction": {
      "type": "dual",
      "frequency": "everyNight",
      "actions": [
        {
          "type": "heal",
          "uses": 1,
          "targetCount": 1
        },
        {
          "type": "kill",
          "uses": 1,
          "targetCount": 1
        }
      ]
    }
  }
}
```

### 4.3 Cặp Đôi (Role với win condition phức tạp)
```json
{
  "id": "cap_doi",
  "team": "neutral",
  "skills": {
    "passive": {
      "type": "linkedFate",
      "effect": "dieTogetherWhenOnePartnerDies"
    }
  },
  "winConditions": {
    "conditional": {
      "sameTeam": "originalTeamWins",
      "differentTeam": "beLastTwoSurvivors"
    }
  },
  "specialRules": ["retainsOriginalRole", "cannotBeDirectlyAssigned"]
}
```

## 5. Game State Management

File `role-types.ts` cung cấp các interface TypeScript để quản lý trạng thái game:

### 5.1 Player State
```typescript
interface Player {
  id: string;
  role: Role;
  isAlive: boolean;
  isProtected: boolean;
  isSilenced: boolean;
  isExiled: boolean;
  // ... các trạng thái khác
}
```

### 5.2 Game State
```typescript
interface GameState {
  players: Player[];
  phase: GamePhase;
  nightActions: GameAction[];
  deadPlayers: Player[];
  winner?: Team | string;
}
```

## 6. Lập trình Game Logic

### 6.1 Kiểm tra khả năng thực hiện hành động
```typescript
function canPerformAction(player: Player, action: SkillType): boolean {
  const skill = player.role.skills.nightAction;
  
  if (!skill) return false;
  
  // Check frequency
  if (skill.frequency === 'oncePerGame' && player.hasUsedAction) {
    return false;
  }
  
  // Check if player is alive
  if (!player.isAlive) return false;
  
  // Check if player is silenced/exiled
  if (player.isExiled) return false;
  
  return true;
}
```

### 6.2 Thực thi hành động đêm
```typescript
function executeNightAction(player: Player, targets: Player[]): GameAction {
  const skill = player.role.skills.nightAction;
  
  switch (skill.type) {
    case 'protect':
      targets.forEach(t => t.isProtected = true);
      break;
    case 'kill':
      targets.forEach(t => {
        if (!t.isProtected) {
          t.markedForDeath = true;
        }
      });
      break;
    case 'investigate':
      return {
        playerId: player.id,
        actionType: 'investigate',
        targetIds: targets.map(t => t.id),
        result: getInvestigationResult(targets[0], skill.information)
      };
    // ... các case khác
  }
}
```

### 6.3 Kiểm tra điều kiện thắng
```typescript
function checkWinConditions(state: GameState): WinResult {
  const alivePlayers = state.players.filter(p => p.isAlive);
  
  // Check werewolf win
  const aliveWerewolves = alivePlayers.filter(p => p.role.team === 'werewolf');
  const aliveVillagers = alivePlayers.filter(p => p.role.team === 'villager');
  
  if (aliveWerewolves.length >= aliveVillagers.length) {
    return { winner: 'werewolf' };
  }
  
  if (aliveWerewolves.length === 0) {
    return { winner: 'villager' };
  }
  
  // Check special win conditions
  // Lovers, Cult Leader, etc.
  
  return { winner: null };
}
```

## 7. Lợi ích của cấu trúc mới

1. **Rõ ràng và có cấu trúc**: Mỗi thuộc tính có ý nghĩa cụ thể
2. **Dễ validate**: Có thể kiểm tra tính hợp lệ của data
3. **Type-safe**: Sử dụng TypeScript để tránh lỗi
4. **Dễ mở rộng**: Thêm roles mới chỉ cần follow schema
5. **Logic game đơn giản**: Xử lý skills và win conditions theo cấu trúc thống nhất
6. **Tái sử dụng code**: Các skill types tương tự dùng chung logic
7. **Dễ test**: Có thể test từng phần độc lập

## 8. Gợi ý implementation

### 8.1 Validation Schema (với Zod)
```typescript
const nightActionSchema = z.object({
  type: z.enum(['protect', 'kill', 'investigate', ...]),
  frequency: z.enum(['everyNight', 'oncePerGame', ...]),
  targetCount: z.number().optional(),
  // ...
});
```

### 8.2 Game Engine Architecture
```
GameEngine
  ├── RoleManager (quản lý roles, validate)
  ├── PhaseManager (quản lý phases)
  ├── ActionResolver (xử lý actions)
  ├── WinConditionChecker (kiểm tra thắng)
  └── StateManager (quản lý game state)
```

### 8.3 Event System
```typescript
eventBus.on('nightPhaseStart', (state) => {
  // Wake up roles with nightAction
});

eventBus.on('playerDeath', (player, state) => {
  // Check passive skills (linkedFate, revenge, etc.)
});

eventBus.on('dayPhaseEnd', (state) => {
  // Check win conditions
});
```
