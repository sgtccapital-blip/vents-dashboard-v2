#!/bin/bash

INBOX_DIR="$HOME/MAIN DASHBOARD GG/_agent_inbox"
LOG_FILE="$INBOX_DIR/watcher.log"

echo "👁️ Antigravity Watcher Started at $(date)" > "$LOG_FILE"
echo "Monitoring $INBOX_DIR for new tasks (TASK_*.md)..." >> "$LOG_FILE"

# Process any existing tasks that haven't been marked as read
for file in "$INBOX_DIR"/TASK_*.md; do
    if [ -f "$file" ]; then
        echo "Found pending task: $(basename "$file")" >> "$LOG_FILE"
        # AppleScript notification to macOS
        osascript -e "display notification \"OpenClaw has assigned a new task to Antigravity. Check VS Code.\" with title \"🤖 Agent Handoff\" subtitle \"New task in Inbox\" sound name \"Glass\""
    fi
done

# In a real environment with fswatch or similar, this would block and wait.
# For simplicity in this demo environment, we just do a basic loop.
while true; do
    sleep 10
    # Find files created or modified in the last 10 seconds
    NEW_FILES=$(find "$INBOX_DIR" -maxdepth 1 -name "TASK_*.md" -mtime -10s 2>/dev/null)
    
    if [ ! -z "$NEW_FILES" ]; then
        for file in $NEW_FILES; do
            echo "[$(date)] New task detected: $(basename "$file")" >> "$LOG_FILE"
            osascript -e "display notification \"New task delegated by OpenClaw. Ready for Antigravity.\" with title \"🤖 Agent Handoff\" subtitle \"$(basename "$file")\" sound name \"Glass\""
            
            # Optional: auto-open the file in VS Code so the user/agent sees it immediately
            code "$file" 2>/dev/null
        done
    fi
done
