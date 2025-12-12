#!/bin/bash
# Secure wrapper script to run punch-light-controller.py in native messaging mode
# This script is called by the browser extension via native messaging

# Exit on any error
set -e

# Get absolute script directory, resolving symlinks for security
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)" || {
    echo "Error: Failed to determine script directory" >&2
    exit 1
}

# Validate we're in expected directory (defense in depth)
# This prevents execution if the script is moved to an unexpected location
if [[ ! "$SCRIPT_DIR" =~ /punch-up-light/python$ ]]; then
    echo "Error: Script not in expected directory: $SCRIPT_DIR" >&2
    exit 1
fi

# Change to script directory
cd "$SCRIPT_DIR" || {
    echo "Error: Failed to change to script directory" >&2
    exit 1
}

# Use restricted PATH with only system directories
# This prevents attacks via malicious binaries in user directories
export PATH="/usr/local/bin:/usr/bin:/bin"

# Strategy 1: Try pipenv virtualenv with absolute path
PIPENV_LOCATIONS=(
    "/usr/local/bin/pipenv"
    "/usr/bin/pipenv"
    "$HOME/.local/bin/pipenv"
)

for pipenv_path in "${PIPENV_LOCATIONS[@]}"; do
    if [ -x "$pipenv_path" ]; then
        # Get virtualenv path from pipenv
        VENV_PATH=$("$pipenv_path" --venv 2>/dev/null) || continue

        # Validate venv path is under expected location (user's virtualenvs directory)
        # This prevents attacks via malicious pipenv returning arbitrary paths
        if [[ "$VENV_PATH" =~ ^"$HOME"/.local/share/virtualenvs/ ]] || \
           [[ "$VENV_PATH" =~ ^"$HOME"/.virtualenvs/ ]]; then

            PYTHON_BIN="$VENV_PATH/bin/python"

            # Verify it's a real executable Python binary
            if [ -x "$PYTHON_BIN" ] && "$PYTHON_BIN" --version &>/dev/null; then
                # Use absolute paths for everything to prevent PATH attacks
                exec "$PYTHON_BIN" "$SCRIPT_DIR/punch-light-controller.py" native
            fi
        fi
    fi
done

# Strategy 2: Try system Python with absolute paths
PYTHON_LOCATIONS=(
    "/usr/local/bin/python3"
    "/usr/bin/python3"
    "/usr/local/bin/python"
    "/usr/bin/python"
)

for python_path in "${PYTHON_LOCATIONS[@]}"; do
    if [ -x "$python_path" ]; then
        # Verify kasa module is available
        if "$python_path" -c "import kasa" 2>/dev/null; then
            # Use absolute paths to prevent execution of malicious scripts
            exec "$python_path" "$SCRIPT_DIR/punch-light-controller.py" native
        fi
    fi
done

# If we get here, no suitable Python was found
echo "Error: Could not find Python with kasa module installed" >&2
echo "Please install dependencies: cd $SCRIPT_DIR && pipenv install" >&2
exit 1
