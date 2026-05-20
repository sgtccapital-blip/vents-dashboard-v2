import { Type } from '@google/genai';
export declare const agentTools: {
    functionDeclarations: ({
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                projectId: {
                    type: Type;
                    description: string;
                };
                status: {
                    type: Type;
                    description: string;
                };
                priority: {
                    type: Type;
                    description: string;
                };
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                projectId: {
                    type: Type;
                    description: string;
                };
                text: {
                    type: Type;
                    description: string;
                };
                type: {
                    type: Type;
                    description: string;
                };
                status?: never;
                priority?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                command: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                filePath: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                filePath: {
                    type: Type;
                    description: string;
                };
                content: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                url: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                query: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                agentId: {
                    type: Type;
                    description: string;
                };
                taskDescription: {
                    type: Type;
                    description: string;
                };
                priorityScore: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                url: {
                    type: Type;
                    description: string;
                };
                waitForSelector: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                action: {
                    type: Type;
                    description: string;
                };
                targetPath: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                script: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                title: {
                    type: Type;
                    description: string;
                };
                content: {
                    type: Type;
                    description: string;
                };
                folder: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                content: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                directoryPath: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                targetContent?: never;
                replacementContent?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                filePath: {
                    type: Type;
                    description: string;
                };
                targetContent: {
                    type: Type;
                    description: string;
                };
                replacementContent: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                content?: never;
                url?: never;
                query?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                searchPath?: never;
                includes?: never;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: Type;
            properties: {
                searchPath: {
                    type: Type;
                    description: string;
                };
                query: {
                    type: Type;
                    description: string;
                };
                includes: {
                    type: Type;
                    description: string;
                };
                projectId?: never;
                status?: never;
                priority?: never;
                text?: never;
                type?: never;
                command?: never;
                filePath?: never;
                content?: never;
                url?: never;
                agentId?: never;
                taskDescription?: never;
                priorityScore?: never;
                waitForSelector?: never;
                action?: never;
                targetPath?: never;
                script?: never;
                title?: never;
                folder?: never;
                directoryPath?: never;
                targetContent?: never;
                replacementContent?: never;
            };
            required: string[];
        };
    })[];
}[];
export declare function executeTool(callName: string, args: any): Promise<string>;
//# sourceMappingURL=nativeTools.d.ts.map