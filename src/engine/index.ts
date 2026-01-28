/**
 * Engine module exports
 */

// Core managers
export { RoleManager, getRoleManager, resetRoleManager } from './RoleManager';
export { PlayerStateManager, EnhancedPlayerState, PlayerInput } from './PlayerStateManager';
export { ActionResolver, GameAction, ActionResult, NightResolutionResult, ACTION_PRIORITY } from './ActionResolver';
export { WinConditionChecker, WinResult } from './WinConditionChecker';
export { PassiveSkillHandler, PassiveEffect, DeathProcessingResult } from './PassiveSkillHandler';
export { GameEngine, GameConfig, GameState, NightPhaseResult, DayPhaseResult, createGameEngine, resetGameEngine } from './GameEngine';

// Existing exports
export { getNightSequence, getNextRole, getPreviousRole } from './nightSequence';
export { createInitialPhase, advanceToDay, advanceToNight, getPhaseDisplay } from './phaseController';
export { assignRandomRoles } from './roleAssignment';
