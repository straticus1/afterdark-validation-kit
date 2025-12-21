#!/bin/bash
# AfterDark Validation Kit - Quick validation script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}AfterDark Validation Kit${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check dependencies
check_deps() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed${NC}"
        exit 1
    fi

    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is not installed${NC}"
        exit 1
    fi

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
        npm install
    fi

    echo -e "${GREEN}Dependencies OK${NC}"
    echo ""
}

# Run Node.js tests
run_node_tests() {
    echo -e "${BLUE}Running Node.js tests...${NC}"
    node src/node/runner.js "$@"
}

# Run Python tests
run_python_tests() {
    echo -e "${BLUE}Running Python tests...${NC}"
    python3 -m src.python.run_tests "$@"
}

# Main
case "${1:-all}" in
    all)
        check_deps
        run_node_tests --all
        run_python_tests --all
        ;;
    node)
        check_deps
        shift
        run_node_tests "$@"
        ;;
    python)
        check_deps
        shift
        run_python_tests "$@"
        ;;
    api)
        check_deps
        run_node_tests --api
        ;;
    security)
        check_deps
        run_node_tests --security
        ;;
    cdn)
        check_deps
        run_node_tests --cdn
        ;;
    database)
        check_deps
        run_node_tests --database
        ;;
    sites)
        check_deps
        run_node_tests --sites
        ;;
    oci)
        check_deps
        run_python_tests --oci
        ;;
    neon)
        check_deps
        run_python_tests --neon
        ;;
    import)
        check_deps
        shift
        node src/node/import-api.js "$@"
        ;;
    help|--help|-h)
        echo "Usage: ./validate.sh [command]"
        echo ""
        echo "Commands:"
        echo "  all       Run all tests (default)"
        echo "  node      Run Node.js tests only"
        echo "  python    Run Python tests only"
        echo "  api       Run API tests"
        echo "  security  Run security tests"
        echo "  cdn       Run CDN tests"
        echo "  database  Run database tests"
        echo "  sites     Run site tests"
        echo "  oci       Run Oracle Cloud tests"
        echo "  neon      Run Neon database tests"
        echo "  import    Import API keys from directory"
        echo "  help      Show this help"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run './validate.sh help' for usage"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
