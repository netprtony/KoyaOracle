/**
 * CommandFactory - Factory for creating command instances
 * 
 * Dynamically instantiates commands based on role skill definitions from roles.json.
 * Maps skill types to command classes.
 */

import { ICommand } from '../ICommand';
import { WerewolfKillCommand } from './WerewolfKillCommand';
import { GuardProtectCommand } from './GuardProtectCommand';
import { WitchHealCommand } from './WitchHealCommand';
import { WitchPoisonCommand } from './WitchPoisonCommand';
import { SeerInvestigateCommand } from './SeerInvestigateCommand';
import { BaseCommand } from '../BaseCommand';

/**
 * Skill type to command class mapping
 */
type CommandConstructor = new (actorId: string, ...targetIds: string[]) => BaseCommand;

export class CommandFactory {
    private commandMap: Map<string, CommandConstructor>;

    constructor() {
        this.commandMap = new Map();
        this.registerDefaultCommands();
    }

    /**
     * Register default command mappings
     */
    private registerDefaultCommands(): void {
        // Map skill types from roles.json to command classes
        this.commandMap.set('kill', WerewolfKillCommand);
        this.commandMap.set('protect', GuardProtectCommand);
        this.commandMap.set('heal', WitchHealCommand);
        this.commandMap.set('poison', WitchPoisonCommand);
        this.commandMap.set('investigate', SeerInvestigateCommand);

        // Additional skill types can be registered here
        // this.commandMap.set('silence', SorcererSilenceCommand);
        // this.commandMap.set('exile', OldWomanExileCommand);
        // this.commandMap.set('bless', PriestBlessCommand);
        // etc.
    }

    /**
     * Register a custom command class for a skill type
     */
    registerCommand(skillType: string, commandClass: CommandConstructor): void {
        this.commandMap.set(skillType, commandClass);
    }

    /**
     * Create a command instance from skill type and parameters
     * 
     * @param skillType - Type of skill action (from roles.json)
     * @param actorId - ID of player performing action
     * @param targetIds - IDs of target players
     * @param actorRoleId - Role ID of actor (for validation)
     * @returns Command instance or null if skill type not found
     */
    createCommand(
        skillType: string,
        actorId: string,
        targetIds: string[],
        actorRoleId?: string
    ): ICommand | null {
        const CommandClass = this.commandMap.get(skillType);

        if (!CommandClass) {
            console.warn(`No command class registered for skill type: ${skillType}`);
            return null;
        }

        // Create command instance
        // Most commands take (actorId, targetId)
        // Some may take multiple targets
        try {
            if (targetIds.length === 0) {
                // No target command (rare, but possible)
                return new CommandClass(actorId);
            } else if (targetIds.length === 1) {
                // Single target (most common)
                return new CommandClass(actorId, targetIds[0]);
            } else {
                // Multiple targets
                return new CommandClass(actorId, ...targetIds);
            }
        } catch (error) {
            console.error(`Failed to create command for skill type ${skillType}:`, error);
            return null;
        }
    }

    /**
     * Create command from role ID and action type
     * This is useful when you have the role ID instead of skill type
     * 
     * @param roleId - Role ID (e.g., 'soi', 'phu_thuy')
     * @param actionType - Action type (e.g., 'kill', 'heal', 'poison')
     * @param actorId - ID of player performing action
     * @param targetIds - IDs of target players
     */
    createCommandFromRole(
        roleId: string,
        actionType: string,
        actorId: string,
        targetIds: string[]
    ): ICommand | null {
        // For witch, we need to distinguish between heal and poison
        if (roleId === 'phu_thuy') {
            if (actionType === 'heal') {
                return new WitchHealCommand(actorId, targetIds[0]);
            } else if (actionType === 'kill' || actionType === 'poison') {
                return new WitchPoisonCommand(actorId, targetIds[0]);
            }
        }

        // For other roles, use skill type directly
        return this.createCommand(actionType, actorId, targetIds, roleId);
    }

    /**
     * Get all registered skill types
     */
    getRegisteredSkillTypes(): string[] {
        return Array.from(this.commandMap.keys());
    }

    /**
     * Check if skill type is registered
     */
    hasSkillType(skillType: string): boolean {
        return this.commandMap.has(skillType);
    }
}

// Singleton instance
let factoryInstance: CommandFactory | null = null;

/**
 * Get singleton command factory instance
 */
export function getCommandFactory(): CommandFactory {
    if (!factoryInstance) {
        factoryInstance = new CommandFactory();
    }
    return factoryInstance;
}

/**
 * Reset factory instance (for testing)
 */
export function resetCommandFactory(): void {
    factoryInstance = null;
}
