// Comandos para conectar un cliente MCP al Command Center (los usa Agent & RAG y AI Office HQ).
export function setupSnippets(url, token) {
    return [
        ['Claude Code (terminal)', `claude mcp add --transport http arrive-command-center ${url} --header "Authorization: Bearer ${token}"`],
        ['OpenClaw, Hermes o cualquier cliente MCP por HTTP', `URL: ${url}\nCabecera: Authorization: Bearer ${token}`],
        ['Claude Desktop, Cursor y clientes que solo usan stdio (JSON de configuración)', JSON.stringify({
            mcpServers: { 'arrive-command-center': { command: 'npx', args: ['-y', 'mcp-remote', url, '--header', `Authorization: Bearer ${token}`] } },
        }, null, 2)],
    ];
}
