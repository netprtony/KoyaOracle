# GameEngine Migration Guide

## Overview

This guide explains how to migrate the existing `GameEngine` to use the new Command Pattern architecture.

---

## Current Architecture

**GameEngine.ts** currently uses:
- `PlayerStateManager` - Direct state mutations
- `ActionResolver` - Imperative action handling
- Direct method calls like `markAsBitten()`, `markAsProtected()`

---

## New Architecture

**Domain Layer** provides:
- `CommandInvoker` - Command execution with undo/redo
- `NightResolver` - Declarative night resolution
- Immutable `Player` and `GameState` entities
- Bitmask state management

---

## Migration Steps

### Step 1: Add Domain Layer to GameEngine

```typescript
import { CommandInvoker } from '../domain/commands/CommandInvoker';
import { NightResolver } from '../domain/services/NightResolver';
import { GameState as DomainGameState } from '../domain/entities/GameState';
import { getCommandFactory } from '../domain/commands/skills/CommandFactory';

export class GameEngine {
    private commandInvoker: CommandInvoker;
    private nightResolver: NightResolver;
    private domainState: DomainGameState;
    
    // Keep existing managers for backward compatibility
    private stateManager: PlayerStateManager;
    private actionResolver: ActionResolver;
    
    constructor(config: GameConfig) {
        // Initialize domain layer
        this.domainState = this.createInitialDomainState(config.players);
        this.commandInvoker = new CommandInvoker(this.domainState);
        this.nightResolver = new NightResolver(this.commandInvoker, config.nightOrder);
        
        // Keep existing initialization
        this.stateManager = new PlayerStateManager();
        this.actionResolver = new ActionResolver(this.stateManager, this.roleManager);
    }
}
```

---

### Step 2: Replace submitNightAction

**OLD:**
```typescript
submitNightAction(action: GameAction): { success: boolean; message: string } {
    const result = this.actionResolver.submitAction(action);
    return { success: result.success, message: result.message };
}
```

**NEW:**
```typescript
submitNightAction(action: GameAction): { success: boolean; message: string } {
    const factory = getCommandFactory();
    
    // Create command from action
    const command = factory.createCommand(
        action.actionType,
        action.actorId,
        action.targetIds
    );
    
    if (!command) {
        return { success: false, message: 'Invalid action type' };
    }
    
    // Execute command
    const result = this.commandInvoker.execute(command, this.domainState);
    
    if (result.isSuccess) {
        this.domainState = result.newState;
        
        // Sync with legacy state manager
        this.syncToLegacyState(result.newState);
    }
    
    return { 
        success: result.isSuccess, 
        message: result.message || result.error || ''
    };
}
```

---

### Step 3: Replace resolveNight

**OLD:**
```typescript
resolveNight(): NightPhaseResult {
    const actionResult = this.actionResolver.resolveNightPhase();
    // ... process deaths manually
}
```

**NEW:**
```typescript
resolveNight(): NightPhaseResult {
    // Get all commands from history
    const commands = this.commandInvoker.getHistory();
    
    // Resolve using NightResolver
    const resolution = this.nightResolver.resolve(this.domainState, commands);
    
    // Update domain state
    this.domainState = resolution.state;
    
    // Sync with legacy state
    this.syncToLegacyState(resolution.state);
    
    // Convert to legacy format
    return {
        deaths: resolution.deaths,
        savedPlayers: resolution.savedPlayers,
        transformedPlayers: [],
        investigationResults: resolution.investigationResults,
        effects: resolution.effects.map(e => ({
            type: e.type,
            sourcePlayerId: e.playerId,
            message: e.description
        }))
    };
}
```

---

### Step 4: Add Undo/Redo Support

```typescript
/**
 * Undo last night action
 */
undoLastAction(): { success: boolean; message: string } {
    const result = this.commandInvoker.undo(this.domainState);
    
    if (result.isSuccess) {
        this.domainState = result.newState;
        this.syncToLegacyState(result.newState);
    }
    
    return {
        success: result.isSuccess,
        message: result.message || result.error || ''
    };
}

/**
 * Redo last undone action
 */
redoLastAction(): { success: boolean; message: string } {
    const result = this.commandInvoker.redo(this.domainState);
    
    if (result.isSuccess) {
        this.domainState = result.newState;
        this.syncToLegacyState(result.newState);
    }
    
    return {
        success: result.isSuccess,
        message: result.message || result.error || ''
    };
}

/**
 * Check if undo is available
 */
canUndo(): boolean {
    return this.commandInvoker.canUndo();
}

/**
 * Check if redo is available
 */
canRedo(): boolean {
    return this.commandInvoker.canRedo();
}
```

---

### Step 5: Add State Synchronization

```typescript
/**
 * Sync domain state to legacy PlayerStateManager
 * (for backward compatibility during migration)
 */
private syncToLegacyState(domainState: DomainGameState): void {
    for (const domainPlayer of domainState.getAllPlayers()) {
        const legacyState = this.stateManager.getState(domainPlayer.id);
        
        if (legacyState) {
            // Update legacy state from domain player
            legacyState.isAlive = domainPlayer.isAlive;
            
            // Sync bitmask statuses
            if (domainPlayer.isBitten) {
                this.stateManager.markAsBitten(domainPlayer.id);
            }
            if (domainPlayer.isProtected) {
                this.stateManager.markAsProtected(domainPlayer.id);
            }
            // ... sync other statuses
        }
    }
}

/**
 * Create initial domain state from player inputs
 */
private createInitialDomainState(players: PlayerInput[]): DomainGameState {
    const domainPlayers = players.map(p => 
        new Player(
            p.id,
            p.name,
            p.roleId,
            this.getTeamForRole(p.roleId),
            PlayerStatus.ALIVE,
            p.position
        )
    );
    
    return DomainGameState.fromPlayers(domainPlayers);
}
```

---

## Migration Strategy

### Phase 1: Parallel Running (Recommended)
1. Keep both systems running
2. Execute commands in new system
3. Sync results to legacy system
4. Compare outputs for validation
5. Gradually remove legacy code

### Phase 2: Full Migration
1. Remove `ActionResolver`
2. Remove `PlayerStateManager` bitmask methods
3. Use domain layer exclusively
4. Update all tests

---

## Testing Strategy

### Unit Tests
```typescript
describe('GameEngine with Commands', () => {
    it('should execute werewolf kill command', () => {
        const engine = new GameEngine(config);
        
        const result = engine.submitNightAction({
            actorId: 'werewolf1',
            actionType: 'kill',
            targetIds: ['villager1']
        });
        
        expect(result.success).toBe(true);
        expect(engine.canUndo()).toBe(true);
    });
    
    it('should undo and redo actions', () => {
        const engine = new GameEngine(config);
        
        engine.submitNightAction({ /* ... */ });
        engine.undoLastAction();
        
        expect(engine.canRedo()).toBe(true);
        
        engine.redoLastAction();
        // Verify state restored
    });
});
```

### Integration Tests
- Use existing `NightResolver.integration.test.ts`
- Add GameEngine-specific scenarios
- Test backward compatibility

---

## Benefits After Migration

✅ **Undo/Redo**: Full command history  
✅ **Testability**: Pure functions, immutable state  
✅ **Maintainability**: Clear separation of concerns  
✅ **Extensibility**: Easy to add new commands  
✅ **Performance**: Bitmask operations  
✅ **Type Safety**: TypeScript enums

---

## Rollback Plan

If issues arise:
1. Domain layer is isolated - can be disabled
2. Legacy code still functional
3. Remove domain imports
4. Revert to `ActionResolver`

---

## Timeline Estimate

- **Phase 1 (Parallel)**: 2-3 days
- **Testing & Validation**: 1-2 days
- **Phase 2 (Full Migration)**: 1-2 days
- **Total**: ~1 week

---

## Next Steps

1. ✅ Review this migration guide
2. Create feature branch: `feature/command-pattern-migration`
3. Implement Step 1: Add domain layer to GameEngine
4. Implement Step 2-3: Replace core methods
5. Run integration tests
6. Manual UI testing with MANUAL_VERIFICATION.md
7. Code review
8. Merge to main

---

## Support

- Domain layer docs: [walkthrough.md](file:///C:/Users/netprtony/.gemini/antigravity/brain/e502d142-f309-4b20-84d2-080928096958/walkthrough.md)
- Manual testing: [MANUAL_VERIFICATION.md](file:///d:/KoyaOracle/MANUAL_VERIFICATION.md)
- Integration tests: [NightResolver.integration.test.ts](file:///d:/KoyaOracle/src/domain/services/__tests__/NightResolver.integration.test.ts)
