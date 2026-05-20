export declare const openAITools: {
    type: string;
    function: {
        name: any;
        description: any;
        parameters: {
            type: string;
            properties: Record<string, any>;
            required: any;
        };
    };
}[];
/**
 * Llama al motor local de OpenClaw (vía Ollama) con soporte para Tool Calling
 */
export declare function callOpenClawEngine(systemPrompt: string, userMessage: string, modelName?: string): Promise<any>;
/**
 * Segunda llamada después de ejecutar una herramienta, para que sintetice la respuesta.
 */
export declare function callOpenClawSynthesizer(systemPrompt: string, toolResultPrompt: string, modelName?: string): Promise<string>;
//# sourceMappingURL=openclawBridge.d.ts.map