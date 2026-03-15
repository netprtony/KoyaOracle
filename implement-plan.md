# KoyaOracle — Implementation Plan
> Tasks: Lovers Death-Link Fix · Thanh Niên Cứng · Con Lai · Unit Tests
> Stack: React Native + Expo · TypeScript · Zustand · Expo SQLite

---

## Table of Contents
1. [Overview & Scope](#1-overview--scope)
2. [State Machine Updates](#2-state-machine-updates)
3. [Task 1 — Sửa Logic Cặp Đôi (Death-Link)](#3-task-1--sửa-logic-cặp-đôi-death-link)
4. [Task 2 — Thanh Niên Cứng (Tough Guy)](#4-task-2--thanh-niên-cứng-tough-guy)
5. [Task 3 — Con Lai (Half-Blood)](#5-task-3--con-lai-half-blood)
6. [Code Changes by File/Folder](#6-code-changes-by-filefolder)
7. [Database Schema Updates](#7-database-schema-updates)
8. [Code Snippets](#8-code-snippets)
9. [Unit Tests](#9-unit-tests)

---

## 1. Overview & Scope

### Tóm tắt thay đổi

| Task | Loại | Độ phức tạp | Files ảnh hưởng |
|---|---|---|---|
| Lovers death-link restore | Bug Fix | Thấp | `deathPipeline`, `gameStore` |
| Thanh Niên Cứng | New Role | Cao | `types`, `store`, `engine`, `components` |
| Con Lai | New Role | Thấp | `types`, `constants/roles`, `engine/seerScan` |
| Unit Tests | Testing | Trung bình | `__tests__/` |

### Nguyên tắc
- **Không phá vỡ** state machine hiện tại — inject vào các hook đã có
- **Tái sử dụng** `MorningReport`, `SkillModal`, `PlayerList`
- **Delayed death** của Thanh Niên Cứng phải transparent với hệ thống (không hiển thị cho người chơi cho đến đúng sáng)
- **Flag-based** cho mọi trạng thái đặc biệt — dễ serialize vào SQLite

---

## 2. State Machine Updates

### 2.1 NightResolution — pipeline mới với delayed death

```
resolveNightEvents():
  ① collectKillIntents()
  ② filterBlessedVictims()          (Pastor)
  ③ filterWitchSaved()              (Witch)
  ④ separateToughGuyVictims()       ← NEW: tách TNC ra khỏi kill list
       → isAlive = true (chưa chết)
       → toughGuyBittenRound = currentRound
       → scheduledDeathRound = currentRound + 1
  ⑤ applyDeaths(remainingVictims)   (chết bình thường)
  ⑥ processScheduledDeaths()        ← NEW: chạy đầu mỗi đêm, thực hiện TNC đến hạn
  ⑦ resetNightFlags()
```

### 2.2 MorningReport — thêm scheduled death notification

```
MorningReport {
  normalDeaths[]         // chết đêm qua
  scheduledDeaths[]      // ← NEW: TNC đến hạn chết đêm qua
  ← Gộp cả 2 để hiển thị cùng nhau
}
```

### 2.3 Death Pipeline — Lovers death-link

```
applyDeath(playerId, cause):
  if !player.isAlive → return (guard)
  markPlayerDead()
  → if isLover && partner.isAlive && cause !== 'BROKEN_HEART':
      applyDeath(partner.id, 'BROKEN_HEART')   ← RESTORE
  → runDeathHooks()
  → checkWinCondition()
```

### 2.4 SeerScan — thêm Con Lai mask

```
getSeerScanResult(target):
  if target.role === 'HALF_BLOOD' → return 'WOLF'   ← NEW (check đầu tiên)
  if target.isTraitor             → return 'HUMAN'
  if HUMAN_MASK.includes(role)    → return 'HUMAN'
  return getRoleTeamAlignment(target)
```

---

## 3. Task 1 — Sửa Logic Cặp Đôi (Death-Link)

### 3.1 Vấn đề

Death-link của Lovers đã bị **xóa** trong plan trước. Cần **khôi phục** hành vi gốc: khi 1 người trong cặp đôi chết → người còn lại chết theo ngay lập tức.

### 3.2 Sơ đồ trạng thái

```
TRẠNG THÁI SAI (hiện tại):
  applyDeath(A) → log LOVER_PARTNER_DIED → B vẫn sống ✗

TRẠNG THÁI ĐÚNG (cần fix):
  applyDeath(A, cause)
    → markPlayerDead(A)
    → cause !== 'BROKEN_HEART' && B.isAlive
        → applyDeath(B, 'BROKEN_HEART')   ✓
            → markPlayerDead(B)
            → cause === 'BROKEN_HEART' → STOP (không loop)
```

### 3.3 Guard chống infinite loop

Dùng `cause !== 'BROKEN_HEART'` làm điều kiện duy nhất để trigger death-link. Khi B chết do `BROKEN_HEART`, không trigger ngược lại cho A vì A đã `isAlive = false`.

### 3.4 MorningReport

```
💀 [PlayerA] đã chết — Bị Sói cắn
💔 [PlayerB] chết vì đau tim khi mất đi người yêu
```

### 3.5 Edge cases

| Case | Xử lý |
|---|---|
| Cả 2 bị wolf kill cùng đêm | Cả 2 chết bình thường; khi applyDeath(B) chạy, B đã `isAlive=false` → guard skip |
| Lover bị lynch (ban ngày) | Death-link vẫn trigger — partner chết trong DayPhase |
| Lover là TNC bị sói cắn | TNC sống tới đêm N+1; khi TNC thực sự chết (scheduled) → death-link trigger |
| Partner đã chết trước | `partner.isAlive = false` → guard skip, không trigger |

---

## 4. Task 2 — Thanh Niên Cứng (Tough Guy)

### 4.1 Mô tả logic đầy đủ

```
Team:           VILLAGER
Night:          Passive role — không có hành động đêm
Khi bị wolf kill đêm N:
  → KHÔNG chết, isAlive = true
  → toughGuyBittenRound = N
  → scheduledDeathRound = N + 1
  → Hệ thống KHÔNG thông báo đêm N
Sáng sau đêm N+1:
  → processScheduledDeaths() chạy đầu resolveNight
  → Chết thật → thông báo cùng các cái chết khác
Seer scan:      HUMAN
Win condition:  Dân Làng thắng
```

### 4.2 State extensions

```typescript
// src/types/player.types.ts
interface PlayerState {
  toughGuyBittenRound:   number | null
  scheduledDeathRound:   number | null
  scheduledDeathCause:   DeathCause | null
}

// src/types/game.types.ts
interface ScheduledDeath {
  playerId:       string
  causeOfDeath:   DeathCause
  scheduledRound: number
  bittenRound:    number
}

interface GameState {
  scheduledDeaths: ScheduledDeath[]
}
```

### 4.3 Role definition

```typescript
TOUGH_GUY: {
  id: 'TOUGH_GUY',
  name: 'Thanh Niên Cứng',
  team: 'VILLAGER',
  isCompanion: false,
  nightPriority: null,       // passive
  hasPassiveAbility: true,
}
```

### 4.4 separateToughGuyVictims()

Chỉ delay khi:
- `target.role === 'TOUGH_GUY'`
- `intent.cause === 'WOLF_KILL'` (không delay Vampire, Witch poison)
- `target.scheduledDeathRound === null` (chưa bị schedule trước)

Nếu TNC đã có `scheduledDeathRound !== null` (bị cắn đêm trước mà chưa chết) và bị cắn lại → đưa vào immediate kill.

### 4.5 processScheduledDeaths() — chạy đầu mỗi đêm

```
Đầu resolveNightEvents(round N):
  Tìm scheduledDeaths có scheduledRound === N
  → applyDeath(playerId, causeOfDeath)  [full pipeline]
  → log TOUGH_GUY_DIED { bittenRound, deathRound }
  → xóa khỏi scheduledDeaths queue
```

### 4.6 cancelScheduledDeath() — khi TNC chết trước hạn

Khi TNC bị lynch hoặc chết do nguyên nhân khác trước `scheduledDeathRound`:
- `applyDeath()` sẽ chạy bình thường
- `applyDeath()` phải tự cleanup: nếu player là TNC có `scheduledDeathRound !== null` → xóa khỏi `scheduledDeaths` queue

```typescript
// Trong applyDeath():
if (player.role === 'TOUGH_GUY' && player.scheduledDeathRound !== null) {
  nextState.scheduledDeaths = nextState.scheduledDeaths.filter(
    d => d.playerId !== playerId
  );
}
```

### 4.7 Edge cases

| Case | Xử lý |
|---|---|
| TNC bị sói cắn, Witch cứu cùng đêm | Witch save chạy trước `separateToughGuy` → TNC không bị delay |
| TNC bị Witch poison | `cause = WITCH_POISON` → immediate death |
| TNC bị Vampire hút | `cause = VAMPIRE_KILL` → immediate death |
| TNC bị cắn đêm 1, bị lynch ngày 1 | Lynch → `applyDeath(LYNCH)` → cleanup scheduled → TNC chết, không còn trong queue |
| TNC bị cắn 2 lần (N và N+1) | Đêm N+1: đã có `scheduledDeathRound !== null` → immediate kill |
| TNC là Lover, partner chết | `applyDeath(TNC, BROKEN_HEART)` → cleanup scheduled → TNC chết ngay |
| TNC chết scheduled → Hunter revenge | Full death pipeline → trigger Hunter bình thường |
| TNC chết scheduled → Lovers death-link | Full death pipeline → trigger death-link bình thường |

---

## 5. Task 3 — Con Lai (Half-Blood)

### 5.1 Mô tả logic

```
Team:           VILLAGER
Night:          Passive — không có hành động
Đặc biệt:      Seer soi → kết quả "SÓI" (mislead)
Win condition:  Dân Làng thắng (không cần điều kiện riêng)
```

### 5.2 Role definition

```typescript
HALF_BLOOD: {
  id: 'HALF_BLOOD',
  name: 'Con Lai',
  team: 'VILLAGER',
  isCompanion: false,
  nightPriority: null,
  seerScanOverride: 'WOLF',
}
```

### 5.3 Vị trí check trong getSeerScanResult()

Con Lai phải được check **trước** `HUMAN_MASK` vì Con Lai có `team: VILLAGER` nhưng cần trả về `WOLF`. Nếu check sau, HUMAN_MASK không chứa HALF_BLOOD thì cũng đúng — nhưng đặt trước để explicit và dễ maintain.

### 5.4 Win condition counting

Con Lai `team: VILLAGER` nên tự động được đếm đúng trong:
- Wolf win check: `wolves >= villagers` → Con Lai tính là villager ✓
- Villager win check: `no wolves alive` → Con Lai thắng cùng villager ✓

Không cần thay đổi `winCondition.ts`.

### 5.5 Edge cases

| Case | Xử lý |
|---|---|
| Seer soi Con Lai | Trả về `WOLF` |
| Bà Đồng soi Con Lai | `role !== SEER` → INCORRECT |
| Wolf win check với Con Lai alive | Con Lai tính là dân làng (cản wolves thắng) |
| Con Lai là Lover với Wolf | Win condition ưu tiên Lovers win nếu thoả điều kiện |

---

## 6. Code Changes by File/Folder

### `src/types/`

| File | Thay đổi |
|---|---|
| `player.types.ts` | Thêm `toughGuyBittenRound`, `scheduledDeathRound`, `scheduledDeathCause` |
| `game.types.ts` | Thêm `ScheduledDeath` interface, `scheduledDeaths: ScheduledDeath[]` |
| `role.types.ts` | Thêm `hasPassiveAbility?: boolean`, `seerScanOverride?: Alignment` |
| `event.types.ts` | Thêm `TOUGH_GUY_BITTEN`, `TOUGH_GUY_DIED`, `LOVER_BROKEN_HEART` |

### `src/constants/`

| File | Thay đổi |
|---|---|
| `roles.ts` | Thêm `TOUGH_GUY`, `HALF_BLOOD` definitions |

### `src/engine/`

| File | Thay đổi |
|---|---|
| `resolveNight.ts` | Thêm `separateToughGuyVictims()`, `applyDelayedDeaths()`, `processScheduledDeaths()`; update pipeline order |
| `seerScan.ts` | Thêm `HALF_BLOOD → WOLF` check trước mọi check khác |
| `deathPipeline.ts` | **Restore** death-link với guard `cause !== 'BROKEN_HEART'`; thêm TNC scheduled cleanup |
| `winCondition.ts` | Không thay đổi |
| `nightSequence.ts` | Không thay đổi (TNC và HALF_BLOOD là passive) |

### `src/store/`

| File | Thay đổi |
|---|---|
| `gameStore.ts` | Thêm `scheduledDeaths: []` vào initial state |

### `src/components/`

| File | Thay đổi |
|---|---|
| `game/MorningReport.tsx` | Gộp `TOUGH_GUY_DIED` events vào death list với note đặc biệt |
| `game/PlayerCard.tsx` | GM-only: hiển thị warning icon nếu `scheduledDeathRound !== null` |

---

## 7. Database Schema Updates

Không cần `ALTER TABLE`. Chỉ thêm giá trị mới cho cột `type TEXT` trong `match_events`:

```sql
-- Giá trị mới cho match_events.type:
'TOUGH_GUY_BITTEN'    -- { actorId: wolfId, targetId: tncId, detail: { bittenRound, scheduledDeathRound } }
'TOUGH_GUY_DIED'      -- { targetId: tncId, detail: { bittenRound, deathRound } }
'LOVER_BROKEN_HEART'  -- { targetId: survivorId, detail: { deceasedPartnerId } }
```

`match_players.deathRound` lưu `scheduledDeathRound` (không phải `bittenRound`) cho TNC.

---

## 8. Code Snippets

### Snippet 1 — deathPipeline.ts: Restore Lovers death-link

```typescript
// src/engine/deathPipeline.ts
export function applyDeath(
  playerId: string,
  cause: DeathCause,
  state: GameState
): GameState {
  const player = state.players.find(p => p.id === playerId);

  // Guard: đã chết rồi thì bỏ qua
  if (!player || !player.isAlive) return state;

  let nextState = markPlayerDead(player, cause, state);

  // Cleanup TNC scheduled death nếu chết trước hạn
  if (player.role === 'TOUGH_GUY' && player.scheduledDeathRound !== null) {
    nextState = {
      ...nextState,
      scheduledDeaths: nextState.scheduledDeaths.filter(d => d.playerId !== playerId),
    };
  }

  // RESTORED: Lovers death-link — chỉ trigger 1 chiều
  if (player.isLover && player.loverId && cause !== 'BROKEN_HEART') {
    const partner = nextState.players.find(p => p.id === player.loverId);
    if (partner?.isAlive) {
      nextState = applyDeath(partner.id, 'BROKEN_HEART', nextState);
    }
  }

  // Death hooks (Hunter, Bewitched, v.v.)
  nextState = runDeathHooks(player, cause, nextState);

  return nextState;
}
```

### Snippet 2 — resolveNight.ts: Pipeline đầy đủ

```typescript
// src/engine/resolveNight.ts
export function resolveNightEvents(state: GameState): GameState {
  // ① TNC scheduled từ đêm trước đến hạn
  let nextState = processScheduledDeaths(state);

  // ② Collect kill intents đêm nay
  let killIntents = collectNightKills(nextState);

  // ③ Pastor immunity
  if (nextState.blessedPlayerId) {
    killIntents = killIntents.filter(i => i.targetId !== nextState.blessedPlayerId);
  }

  // ④ Witch save
  killIntents = filterWitchSaved(killIntents, nextState);

  // ⑤ Tách TNC (chỉ WOLF_KILL và chưa scheduled)
  const { immediate, delayed } = separateToughGuyVictims(killIntents, nextState);

  // ⑥ Immediate deaths
  for (const intent of immediate) {
    nextState = applyDeath(intent.targetId, intent.cause, nextState);
  }

  // ⑦ Schedule TNC deaths
  nextState = applyDelayedDeaths(delayed, nextState);

  // ⑧ Reset night flags
  return resetNightFlags(nextState);
}

function processScheduledDeaths(state: GameState): GameState {
  const due = state.scheduledDeaths.filter(d => d.scheduledRound === state.currentRound);
  if (due.length === 0) return state;

  let nextState = {
    ...state,
    scheduledDeaths: state.scheduledDeaths.filter(d => d.scheduledRound !== state.currentRound),
  };

  for (const scheduled of due) {
    // Chỉ xử lý nếu player vẫn còn sống (có thể bị lynch trước)
    const player = nextState.players.find(p => p.id === scheduled.playerId);
    if (player?.isAlive) {
      nextState = applyDeath(scheduled.playerId, 'SCHEDULED_DEATH', nextState);
      nextState = logEvent(nextState, {
        type: 'TOUGH_GUY_DIED',
        targetId: scheduled.playerId,
        bittenRound: scheduled.bittenRound,
        deathRound: scheduled.scheduledRound,
      });
    }
  }

  return nextState;
}

function separateToughGuyVictims(
  intents: KillIntent[],
  state: GameState
): { immediate: KillIntent[]; delayed: KillIntent[] } {
  return intents.reduce(
    (acc, intent) => {
      const target = state.players.find(p => p.id === intent.targetId);
      const shouldDelay =
        target?.role === 'TOUGH_GUY' &&
        intent.cause === 'WOLF_KILL' &&
        target.scheduledDeathRound === null;  // chưa bị delay trước đó

      if (shouldDelay) acc.delayed.push(intent);
      else acc.immediate.push(intent);
      return acc;
    },
    { immediate: [] as KillIntent[], delayed: [] as KillIntent[] }
  );
}
```

### Snippet 3 — seerScan.ts: Con Lai override

```typescript
// src/engine/seerScan.ts
const HUMAN_MASK: RoleId[] = ['MEDIUM', 'PASTOR', 'HUNTER'];

export function getSeerScanResult(target: PlayerState): Alignment {
  // Con Lai: LUÔN xuất hiện là SÓI (check đầu tiên — override mọi thứ)
  if (target.role === 'HALF_BLOOD') return 'WOLF';

  // Traitor: LUÔN xuất hiện là NGƯỜI
  if (target.isTraitor) return 'HUMAN';

  // Human mask
  if (HUMAN_MASK.includes(target.role)) return 'HUMAN';

  // Default
  return getRoleTeamAlignment(target);
}
```

### Snippet 4 — MorningReport.tsx: TNC death note

```typescript
// src/components/game/MorningReport.tsx
function DeathNotice({ event }: { event: GameEvent }) {
  const isToughGuyScheduled = event.type === 'TOUGH_GUY_DIED';
  const player = usePlayer(event.targetId);

  return (
    <View style={styles.deathRow}>
      <Text style={styles.icon}>{isToughGuyScheduled ? '💀⏱' : '💀'}</Text>
      <View>
        <Text style={styles.name}>{player.name} — {getRoleName(player.role)}</Text>
        {isToughGuyScheduled && (
          <Text style={styles.note}>
            Bị cắn từ đêm {event.bittenRound}, chiến đấu đến hơi thở cuối cùng
          </Text>
        )}
      </View>
    </View>
  );
}
```

---

## 9. Unit Tests

### 9.1 File Structure

```
src/__tests__/
├── roles/
│   ├── lovers.test.ts
│   ├── toughGuy.test.ts
│   └── halfBlood.test.ts
├── engine/
│   ├── deathPipeline.test.ts
│   ├── resolveNight.test.ts
│   └── seerScan.test.ts
└── utils/
    └── testHelpers.ts
```

### 9.2 testHelpers.ts

```typescript
// src/__tests__/utils/testHelpers.ts
export const makePlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  id: 'p_default',
  name: 'Test Player',
  role: 'VILLAGER',
  team: 'VILLAGER',
  isAlive: true,
  isLover: false,
  loverId: null,
  isBlessed: false,
  isTraitor: false,
  toughGuyBittenRound: null,
  scheduledDeathRound: null,
  scheduledDeathCause: null,
  ...overrides,
});

export const makeGameState = (overrides: Partial<GameState> = {}): GameState => ({
  currentRound: 1,
  phase: 'NIGHT',
  players: [],
  scheduledDeaths: [],
  blessedPlayerId: null,
  wolfKillTarget: null,
  vampireKillTarget: null,
  witchSaveTarget: null,
  eventLog: [],
  ...overrides,
});
```

### 9.3 lovers.test.ts

```typescript
describe('Lovers — Death-Link Restored', () => {
  const pA = makePlayer({ id: 'A', isLover: true, loverId: 'B' });
  const pB = makePlayer({ id: 'B', isLover: true, loverId: 'A' });
  const state = makeGameState({ players: [pA, pB] });

  test('L-01: Lover A chết → Lover B chết theo', () => {
    const result = applyDeath('A', 'WOLF_KILL', state);
    expect(result.players.find(p => p.id === 'B')?.isAlive).toBe(false);
  });

  test('L-02: Nguyên nhân chết của B là BROKEN_HEART', () => {
    const result = applyDeath('A', 'WOLF_KILL', state);
    const event = result.eventLog.find(
      e => e.type === 'LOVER_BROKEN_HEART' && e.targetId === 'B'
    );
    expect(event).toBeDefined();
  });

  test('L-03: Không có infinite loop', () => {
    expect(() => applyDeath('A', 'WOLF_KILL', state)).not.toThrow();
    const result = applyDeath('A', 'WOLF_KILL', state);
    const deaths = result.eventLog.filter(e => e.type === 'PLAYER_DIED');
    expect(deaths.length).toBe(2); // A và B, không có lần 3
  });

  test('L-04: A không bị chết 2 lần', () => {
    const result = applyDeath('A', 'WOLF_KILL', state);
    const aDeaths = result.eventLog.filter(e => e.type === 'PLAYER_DIED' && e.targetId === 'A');
    expect(aDeaths.length).toBe(1);
  });

  test('L-05: Lynch ban ngày cũng trigger death-link', () => {
    const result = applyDeath('A', 'LYNCH', state);
    expect(result.players.find(p => p.id === 'B')?.isAlive).toBe(false);
  });

  test('L-06: Cả 2 bị kill cùng đêm — không duplicate death', () => {
    let s = applyDeath('A', 'WOLF_KILL', state);
    s = applyDeath('B', 'WOLF_KILL', s); // B đã chết → guard skip
    const deaths = s.eventLog.filter(e => e.type === 'PLAYER_DIED');
    expect(deaths.length).toBe(2);
  });
});
```

### 9.4 toughGuy.test.ts

```typescript
describe('Thanh Niên Cứng — Delayed Death', () => {
  const tnc = makePlayer({ id: 'TNC', role: 'TOUGH_GUY' });

  test('TNC-01: Bị wolf kill đêm N → không chết ngay', () => {
    const state = makeGameState({ players: [tnc], wolfKillTarget: 'TNC' });
    const result = resolveNightEvents(state);
    expect(result.players.find(p => p.id === 'TNC')?.isAlive).toBe(true);
  });

  test('TNC-02: scheduledDeathRound = currentRound + 1 sau khi bị cắn', () => {
    const state = makeGameState({ currentRound: 1, players: [tnc], wolfKillTarget: 'TNC' });
    const result = resolveNightEvents(state);
    expect(result.players.find(p => p.id === 'TNC')?.scheduledDeathRound).toBe(2);
  });

  test('TNC-03: Đêm N — MorningReport không thông báo TNC chết', () => {
    const state = makeGameState({ players: [tnc], wolfKillTarget: 'TNC' });
    const result = resolveNightEvents(state);
    const playerDiedEvents = result.eventLog.filter(e => e.type === 'PLAYER_DIED');
    expect(playerDiedEvents.some(e => e.targetId === 'TNC')).toBe(false);
  });

  test('TNC-04: Đêm N+1 → TNC thực sự chết', () => {
    const tncBitten = makePlayer({
      id: 'TNC', role: 'TOUGH_GUY', isAlive: true,
      scheduledDeathRound: 2, toughGuyBittenRound: 1, scheduledDeathCause: 'WOLF_KILL',
    });
    const state = makeGameState({
      currentRound: 2,
      players: [tncBitten],
      scheduledDeaths: [{ playerId: 'TNC', causeOfDeath: 'WOLF_KILL', scheduledRound: 2, bittenRound: 1 }],
    });
    const result = resolveNightEvents(state);
    expect(result.players.find(p => p.id === 'TNC')?.isAlive).toBe(false);
  });

  test('TNC-05: Event TOUGH_GUY_DIED được log với đúng metadata', () => {
    const tncBitten = makePlayer({
      id: 'TNC', role: 'TOUGH_GUY', isAlive: true,
      scheduledDeathRound: 2, toughGuyBittenRound: 1, scheduledDeathCause: 'WOLF_KILL',
    });
    const state = makeGameState({
      currentRound: 2,
      players: [tncBitten],
      scheduledDeaths: [{ playerId: 'TNC', causeOfDeath: 'WOLF_KILL', scheduledRound: 2, bittenRound: 1 }],
    });
    const result = resolveNightEvents(state);
    const event = result.eventLog.find(e => e.type === 'TOUGH_GUY_DIED');
    expect(event?.bittenRound).toBe(1);
    expect(event?.deathRound).toBe(2);
  });

  test('TNC-06: Bị lynch trước đêm N+1 → scheduled death bị cancel', () => {
    const tncBitten = makePlayer({
      id: 'TNC', role: 'TOUGH_GUY', isAlive: true,
      scheduledDeathRound: 2, toughGuyBittenRound: 1, scheduledDeathCause: 'WOLF_KILL',
    });
    const state = makeGameState({
      currentRound: 2,
      players: [tncBitten],
      scheduledDeaths: [{ playerId: 'TNC', causeOfDeath: 'WOLF_KILL', scheduledRound: 2, bittenRound: 1 }],
    });
    const afterLynch = applyDeath('TNC', 'LYNCH', state);
    const result = resolveNightEvents(afterLynch);
    const scheduledEvents = result.eventLog.filter(e => e.type === 'TOUGH_GUY_DIED');
    expect(scheduledEvents.length).toBe(0);
  });

  test('TNC-07: Vampire kill → chết ngay (không delay)', () => {
    const state = makeGameState({ players: [tnc], vampireKillTarget: 'TNC' });
    const result = resolveNightEvents(state);
    expect(result.players.find(p => p.id === 'TNC')?.isAlive).toBe(false);
    expect(result.players.find(p => p.id === 'TNC')?.scheduledDeathRound).toBeNull();
  });

  test('TNC-08: Witch cứu cùng đêm bị cắn → không schedule', () => {
    const state = makeGameState({
      players: [tnc], wolfKillTarget: 'TNC', witchSaveTarget: 'TNC',
    });
    const result = resolveNightEvents(state);
    expect(result.players.find(p => p.id === 'TNC')?.isAlive).toBe(true);
    expect(result.players.find(p => p.id === 'TNC')?.scheduledDeathRound).toBeNull();
  });

  test('TNC-09: TNC là Lover, partner chết → death-link override (TNC chết ngay)', () => {
    const tncLover = makePlayer({
      id: 'TNC', role: 'TOUGH_GUY', isLover: true, loverId: 'P',
      scheduledDeathRound: 3, toughGuyBittenRound: 2,
    });
    const partner = makePlayer({ id: 'P', isLover: true, loverId: 'TNC' });
    const state = makeGameState({ players: [tncLover, partner] });
    const result = applyDeath('P', 'WOLF_KILL', state);
    expect(result.players.find(p => p.id === 'TNC')?.isAlive).toBe(false);
    // scheduledDeaths queue phải được cleanup
    expect(result.scheduledDeaths.some(d => d.playerId === 'TNC')).toBe(false);
  });
});
```

### 9.5 halfBlood.test.ts

```typescript
describe('Con Lai — Half-Blood', () => {
  const hb = makePlayer({ id: 'HB', role: 'HALF_BLOOD', team: 'VILLAGER' });

  test('HB-01: Seer soi Con Lai → WOLF', () => {
    expect(getSeerScanResult(hb)).toBe('WOLF');
  });

  test('HB-02: Con Lai thắng khi Dân Làng thắng', () => {
    const state = makeGameState({
      players: [
        { ...hb, isAlive: true },
        makePlayer({ id: 'V1', team: 'VILLAGER', isAlive: true }),
        makePlayer({ id: 'W1', role: 'WEREWOLF', team: 'WOLF', isAlive: false }),
      ],
    });
    const result = checkWinCondition(state);
    expect(result?.winner).toBe('VILLAGER');
    expect(result?.winnerIds).toContain('HB');
  });

  test('HB-03: Con Lai không thắng khi Sói thắng', () => {
    const state = makeGameState({
      players: [
        { ...hb, isAlive: false },
        makePlayer({ id: 'W1', role: 'WEREWOLF', team: 'WOLF', isAlive: true }),
      ],
    });
    expect(checkWinCondition(state)?.winner).toBe('WEREWOLF');
  });

  test('HB-04: Con Lai alive được đếm là Dân Làng trong wolf-win check', () => {
    // 1 wolf, 1 half-blood alive — wolves chưa đủ điều kiện thắng
    const state = makeGameState({
      players: [
        { ...hb, isAlive: true },
        makePlayer({ id: 'W1', role: 'WEREWOLF', team: 'WOLF', isAlive: true }),
      ],
    });
    const result = checkWinCondition(state);
    expect(result?.winner).not.toBe('WEREWOLF');
  });

  test('HB-05: Bà Đồng soi Con Lai → INCORRECT', () => {
    expect(hb.role === 'SEER').toBe(false);
  });

  test('HB-06: getSeerScanResult ưu tiên HALF_BLOOD trước HUMAN_MASK', () => {
    // Ngay cả khi HALF_BLOOD bị thêm vào HUMAN_MASK nhầm → vẫn trả về WOLF
    expect(getSeerScanResult(hb)).toBe('WOLF'); // không phải HUMAN
  });
});
```

### 9.6 seerScan.test.ts — tổng hợp tất cả masks

```typescript
describe('SeerScan — all alignment masks', () => {
  const cases: [string, Partial<PlayerState>, Alignment][] = [
    ['Villager',      { role: 'VILLAGER',   team: 'VILLAGER' }, 'HUMAN'],
    ['Werewolf',      { role: 'WEREWOLF',   team: 'WOLF'     }, 'WOLF' ],
    ['Seer',          { role: 'SEER',       team: 'VILLAGER' }, 'HUMAN'],
    ['Medium',        { role: 'MEDIUM',     team: 'VILLAGER' }, 'HUMAN'],
    ['Pastor',        { role: 'PASTOR',     team: 'VILLAGER' }, 'HUMAN'],
    ['Half-Blood',    { role: 'HALF_BLOOD', team: 'VILLAGER' }, 'WOLF' ],
    ['Traitor',       { role: 'VILLAGER',   isTraitor: true  }, 'HUMAN'],
    ['Tough Guy',     { role: 'TOUGH_GUY',  team: 'VILLAGER' }, 'HUMAN'],
  ];

  test.each(cases)('%s → %s', (_, overrides, expected) => {
    expect(getSeerScanResult(makePlayer(overrides))).toBe(expected);
  });
});
```

### 9.7 Test Coverage Summary

| File | Tests | Scenarios |
|---|---|---|
| `lovers.test.ts` | 6 | death-link, loop guard, lynch, same-night kill |
| `toughGuy.test.ts` | 9 | delay, schedule, cancel, vampire/witch override, lover interaction |
| `halfBlood.test.ts` | 6 | seer scan, win condition, wolf-count, team alignment |
| `seerScan.test.ts` | 8 | tất cả role masks (parametrized) |
| **Total** | **29** | |

---

*KoyaOracle Implementation Plan — v3.0 | Lovers Fix · Thanh Niên Cứng · Con Lai · 29 Unit Tests*
