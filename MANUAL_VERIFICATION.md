# Manual Verification Guide

## Setup

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Create a new game:**
   - Select "Random Role" mode
   - Choose "Kịch Bản 1" (6 players)
   - Add 6 players with names

## Test Scenarios

### Scenario 1: Werewolf Attack Without Protection

**Night 1:**
1. Werewolf (Sói) selects a villager to kill
2. Guard (Bảo Vệ) protects a different player
3. Advance to day

**Expected Result:**
- ✅ Selected villager should be dead
- ✅ Log should show "X was killed by werewolves"
- ✅ Death count: 1

---

### Scenario 2: Guard Protection Saves Player

**Night 1:**
1. Werewolf selects Player A
2. Guard protects Player A
3. Advance to day

**Expected Result:**
- ✅ Player A should be alive
- ✅ Log should show protection saved the player
- ✅ Death count: 0

---

### Scenario 3: Witch Heal Saves Player

**Night 1:**
1. Werewolf selects Player A
2. Witch uses heal on Player A
3. Advance to day

**Expected Result:**
- ✅ Player A should be alive
- ✅ Witch's heal ability should be marked as used
- ✅ Death count: 0

---

### Scenario 4: Witch Poison Kills Player

**Night 1:**
1. Werewolf selects Player A
2. Witch uses poison on Player B
3. Advance to day

**Expected Result:**
- ✅ Player A should be dead (werewolf attack)
- ✅ Player B should be dead (poison)
- ✅ Death count: 2

---

### Scenario 5: Undo/Redo Functionality

**Night 1:**
1. Werewolf selects Player A
2. Click "Undo" button (Ctrl+Z)
3. Werewolf selection should be cleared
4. Werewolf selects Player B
5. Click "Redo" button (Ctrl+Y)

**Expected Result:**
- ✅ Undo should clear the action
- ✅ Redo should restore the action
- ✅ Command history should be maintained

---

### Scenario 6: Guard Cannot Protect Same Person Twice

**Night 1:**
1. Guard protects Player A

**Night 2:**
1. Try to protect Player A again

**Expected Result:**
- ✅ UI should prevent selecting Player A
- ✅ Or show error message
- ✅ Guard can protect other players

---

### Scenario 7: Witch Single-Use Abilities

**Night 1:**
1. Witch uses heal

**Night 2:**
1. Try to use heal again

**Expected Result:**
- ✅ Heal button should be disabled
- ✅ Poison should still be available

**Night 3:**
1. Witch uses poison

**Night 4:**
1. Try to use poison again

**Expected Result:**
- ✅ Poison button should be disabled
- ✅ Both abilities used

---

## Verification Checklist

### Bitmask State Management
- [ ] Player statuses are tracked correctly
- [ ] Multiple statuses can coexist (e.g., ALIVE + PROTECTED)
- [ ] Temporary statuses are cleared after night resolution

### Command Pattern
- [ ] All night actions are recorded as commands
- [ ] Undo/Redo works for all actions
- [ ] Command history is maintained

### Night Resolution
- [ ] Deaths are calculated correctly using bitmask logic
- [ ] Protection prevents death
- [ ] Witch heal prevents death
- [ ] Witch poison causes death
- [ ] Multiple deaths in one night work correctly

### JSON Integration
- [ ] Night order from KichBan.json is followed
- [ ] Role abilities match roles.json definitions
- [ ] Scenario setup uses correct player counts

### UI Compatibility
- [ ] Existing UI works without changes
- [ ] All buttons and interactions function
- [ ] Game flow is smooth
- [ ] No console errors

---

## Performance Check

1. **Memory Usage:**
   - Open browser DevTools → Performance
   - Record a full game session
   - Check memory usage (should be lower with bitmask)

2. **Command History:**
   - Play 10+ nights
   - Check undo/redo performance
   - Verify no memory leaks

---

## Bug Reporting

If you find issues, report with:
- Scenario being tested
- Expected vs actual behavior
- Console errors (if any)
- Steps to reproduce

---

## Success Criteria

✅ All 7 test scenarios pass  
✅ No console errors  
✅ Undo/redo works smoothly  
✅ Performance is acceptable  
✅ UI remains responsive  
✅ Game logic is correct
