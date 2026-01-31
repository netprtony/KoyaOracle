# Domain Architecture

This document explains the overall domain architecture and design patterns used in the Werewolf game codebase.

## Overview

The domain layer implements a clean, event-driven architecture using the Command Pattern for game actions and a bitmask-based state management system for player status. The design emphasizes immutability, predictable state transitions, and clear separation of concerns.

## Core Architectural Patterns

### 1. Command Pattern Flow

The domain uses a classic Command Pattern implementation for all game actions:

```
Command → CommandInvoker → GameState → CommandResult
```

**Components:**
- **ICommand**: Interface for all game actions (werewolf kill, witch heal, seer investigate, etc.)
- **CommandInvoker**: Manages execution, history, undo/redo functionality
- **GameState**: Immutable state container that commands operate on
- **CommandResult**: Encapsulates execution results with success/failure information

**Flow:**
1. UI creates a command (e.g., `WerewolfKillCommand`)
2. Command is passed to `CommandInvoker.execute()`
3. Invoker validates via `command.canExecute(state)`
4. Command creates new `GameState` with changes applied
5. Result is returned with success/failure and metadata
6. Command is stored in history for undo/redo

### 2. Bitmask-Based State Design

Player status uses efficient bitmask operations for multiple concurrent states:

**PlayerStatus Enum:**
```typescript
enum PlayerStatus {
    ALIVE = 1 << 0,              // 0b...00001
    BITTEN = 1 << 1,             // 0b...00010  
    PROTECTED = 1 << 2,          // 0b...00100
    HEALED = 1 << 3,             // 0b...01000
    POISONED = 1 << 4,           // 0b...10000
    // ... etc
}
```

**Benefits:**
- **Memory Efficient**: Single integer stores multiple status flags
- **Fast Operations**: Bitwise AND/OR for status checks and updates
- **Composable**: Multiple statuses can be combined naturally
- **Performance**: O(1) status operations regardless of number of active statuses

**Usage Examples:**
```typescript
// Check if player is both bitten and protected
hasStatus(mask, PlayerStatus.BITTEN) && hasStatus(mask, PlayerStatus.PROTECTED)

// Remove temporary night statuses
mask &= ~(PlayerStatus.BITTEN | PlayerStatus.PROTECTED | PlayerStatus.HEALED)
```

### 3. Immutable State Management

All domain entities follow immutable patterns:

- **GameState**: Immutable with create-update methods (`updatePlayer()`, `advanceToNight()`)
- **Player**: Immutable with status operations (`addStatus()`, `removeStatus()`)
- **Commands**: Create new state rather than mutating existing state

**Benefits:**
- **Predictable**: State changes only through explicit commands
- **Debuggable**: Complete history of state transitions
- **Testable**: Easy to verify state changes
- **Concurrent Safe**: No shared mutable state

## Domain vs Engine Layer Interaction

### Domain Layer (`src/domain/`)
**Responsibilities:**
- Core game rules and logic
- State management and persistence
- Command pattern implementation
- Business rules validation

**Key Components:**
- `GameState`: Central state authority
- `Player/PlayerStatus`: Player state and bitmask operations
- `CommandInvoker/Commands`: Action execution and history
- `NightResolver`: New night phase resolution using commands

### Engine Layer (`src/engine/`)
**Responsibilities:**
- Legacy game master board UI integration
- Action coordination and priority handling
- Passive skill processing
- Role-specific mechanics

**Key Components:**
- `GameEngine`: Main game loop coordinator
- `ActionResolver`: Legacy action resolution for UI
- `PassiveSkillHandler`: Death effects and passive abilities
- `NightResolution`: **LEGACY** - Used only by UI

### Interaction Patterns

1. **New Implementation (Domain First):**
   ```
   GameEngine → NightResolver → CommandInvoker → Commands → GameState
   ```

2. **Legacy Implementation (UI Dependent):**
   ```
   UI (game-master-board.tsx) → NightResolution (legacy) → PlayerStateManager
   ```

**Important:** Both night resolution implementations must coexist due to UI dependencies.

## Undo/Redo Mechanism

The CommandInvoker provides complete undo/redo functionality:

```
[Initial State] → Command 1 → Command 2 → Command 3 → [Current State]
                                   ↑
                               (undo to here)
```

**Implementation:**
- `CommandInvoker.history[]`: Stores executed commands
- `CommandInvoker.stateHistory[]`: Parallel state snapshots
- `CommandInvoker.currentIndex`: Tracks current position
- `undo()`: Reverts to previous state using command.undo()
- `redo()`: Re-executes forward commands

**Usage:**
```typescript
// Execute action
const result = invoker.execute(command, currentState);

// Undo if needed
if (shouldUndo) {
    const undoResult = invoker.undo(result.newState);
}

// Redo later
const redoResult = invoker.redo(undoResult.newState);
```

## Night Phase Resolution

### New Domain-Based Approach (NightResolver)

1. **Command Execution**: Commands execute in `thu_tu_goi` order from KichBan.json
2. **Death Calculation**: Bitmask logic determines who dies
3. **Cascade Effects**: Lovers/twins chain reactions
4. **Status Cleanup**: Temporary night statuses cleared

### Legacy Engine Approach (NightResolution.ts)

1. **Action Collection**: UI submits actions via ActionResolver
2. **Priority Resolution**: Actions sorted and executed by priority
3. **State Updates**: Direct PlayerStateManager modifications
4. **Effect Processing**: PassiveSkillHandler handles side effects

## Key Design Decisions

### 1. Dual Night Resolution
- **Why**: UI layer depends on legacy NightResolution.ts
- **Solution**: Maintain both implementations with clear documentation
- **Future**: Gradual migration of UI to domain layer

### 2. Bitmask for Status
- **Why**: Multiple concurrent player states are common
- **Alternative**: Boolean flags or enum arrays
- **Trade-off**: Slightly more complex but highly performant

### 3. Immutable Commands
- **Why**: Predictable state changes and full history
- **Alternative**: Mutable state with events
- **Trade-off**: More memory usage but cleaner architecture

### 4. Command Pattern
- **Why**: Encapsulates actions, enables undo/redo, clear separation
- **Alternative**: Direct method calls or event system
- **Trade-off**: More boilerplate but better testability

## Module Relationships

```
GameState ←→ Player ←→ PlayerStatus
    ↓         ↑
CommandInvoker → Commands
    ↓
NightResolver ← ActionResolver (engine)
    ↓
PassiveSkillHandler ← RoleManager
```

**Arrows indicate primary dependencies:**
- GameState contains Players
- Players use PlayerStatus bitmask
- CommandInvoker executes Commands
- Commands modify GameState
- NightResolver coordinates domain night resolution
- ActionResolver provides legacy UI integration

## Testing Strategy

The architecture supports comprehensive testing:

1. **Unit Tests**: Each command tested in isolation
2. **Integration Tests**: CommandInvoker with multiple commands
3. **State Tests**: GameState transition verification
4. **Bitmask Tests**: PlayerStatus operation correctness
5. **Night Resolution Tests**: Complete night phase scenarios

This architecture provides a solid foundation for the Werewolf game while maintaining flexibility for future enhancements and ensuring testability and maintainability.