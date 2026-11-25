// Comandos para conectar un cliente MCP al Command Center (los usa Agent & RAG y AI Office HQ).
export function setupSnippets(url, token, publicUrl) {
    return [
        ...(publicUrl ? [['ChatGPT: URL del conector (autenticación: ninguna, la llave va en la URL)', `${publicUrl}/${token}`]] : []),
        ['Claude Code (terminal)', `claude mcp add --transport http arrive-command-center ${url} --header "Authorization: Bearer ${token}"`],
        ['OpenClaw, Hermes o cualquier cliente MCP por HTTP (token en la URL)', `${url}/${token}`],
        ['Claude Desktop, Cursor y clientes que solo usan stdio (JSON de configuración)', JSON.stringify({
            mcpServers: { 'arrive-command-center': { command: 'npx', args: ['-y', 'mcp-remote', url, '--header', `Authorization: Bearer ${token}`] } },
        }, null, 2)],
    ];
}
