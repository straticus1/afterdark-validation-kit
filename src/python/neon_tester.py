#!/usr/bin/env python3
"""Neon PostgreSQL database testing module."""

import json
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import requests

try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False

from .config import ConfigLoader, get_config


@dataclass
class TestResult:
    """Individual test result."""
    test_type: str
    test_name: str
    passed: bool
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NeonTestResults:
    """Aggregated Neon test results."""
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    warnings: int = 0
    tests: List[TestResult] = field(default_factory=list)


class NeonTester:
    """Neon PostgreSQL testing class."""

    API_BASE = "https://console.neon.tech/api/v2"

    def __init__(self, config: Optional[ConfigLoader] = None):
        self.config = config or get_config()
        self.results = NeonTestResults()
        self.api_key = None
        self.session = None

    def initialize(self) -> bool:
        """Initialize Neon API client."""
        neon_config = self.config.get_api_config("neon")
        self.api_key = neon_config.secrets.get("api_key")

        if not self.api_key:
            self.results.tests.append(TestResult(
                test_type="Neon",
                test_name="API Key",
                passed=False,
                message="NEON_API_KEY not configured"
            ))
            self.results.skipped += 1
            return False

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        })

        return True

    def run_all(self) -> NeonTestResults:
        """Run all Neon tests."""
        if not self.initialize():
            return self.results

        # Test API authentication
        self.test_api_auth()

        # Test projects
        projects = self.test_list_projects()

        # Test each project
        if projects:
            for project in projects[:5]:  # Limit to 5 projects
                self.test_project(project)

        return self.results

    def _api_request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make API request to Neon."""
        url = f"{self.API_BASE}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            return {"error": str(e), "status": response.status_code}
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}

    def test_api_auth(self):
        """Test API authentication."""
        # Use /projects endpoint to test auth (no dedicated auth endpoint)
        result = self._api_request("GET", "/projects?limit=1")

        if result and "error" not in result:
            self.results.tests.append(TestResult(
                test_type="Neon API",
                test_name="Authentication",
                passed=True,
                message="API authentication successful"
            ))
            self.results.passed += 1
            return True
        else:
            self.results.tests.append(TestResult(
                test_type="Neon API",
                test_name="Authentication",
                passed=False,
                message=result.get("error", "Authentication failed")
            ))
            self.results.failed += 1
            return False

    def test_list_projects(self) -> List[Dict]:
        """Test listing projects."""
        result = self._api_request("GET", "/projects")

        if result and "error" not in result:
            projects = result.get("projects", [])
            self.results.tests.append(TestResult(
                test_type="Neon API",
                test_name="List Projects",
                passed=True,
                message=f"Found {len(projects)} projects",
                details={
                    "count": len(projects),
                    "projects": [{"id": p["id"], "name": p["name"]} for p in projects]
                }
            ))
            self.results.passed += 1
            return projects
        else:
            self.results.tests.append(TestResult(
                test_type="Neon API",
                test_name="List Projects",
                passed=False,
                message=result.get("error", "Failed to list projects")
            ))
            self.results.failed += 1
            return []

    def test_project(self, project: Dict):
        """Test a specific project."""
        project_id = project["id"]
        project_name = project["name"]

        # Get project details
        result = self._api_request("GET", f"/projects/{project_id}")

        if result and "error" not in result:
            proj_data = result.get("project", {})
            state = proj_data.get("state", "unknown")
            is_active = state in ("active", "idle")

            self.results.tests.append(TestResult(
                test_type="Neon Project",
                test_name=f"Project: {project_name}",
                passed=is_active,
                message=f"State: {state}",
                details={
                    "id": project_id,
                    "state": state,
                    "region": proj_data.get("region_id"),
                    "created": proj_data.get("created_at")
                }
            ))
            if is_active:
                self.results.passed += 1
            else:
                self.results.warnings += 1

            # Test branches
            self.test_branches(project_id, project_name)

            # Test endpoints
            self.test_endpoints(project_id, project_name)

            # Test operations
            self.test_operations(project_id, project_name)

        else:
            self.results.tests.append(TestResult(
                test_type="Neon Project",
                test_name=f"Project: {project_name}",
                passed=False,
                message=result.get("error", "Failed to get project details")
            ))
            self.results.failed += 1

    def test_branches(self, project_id: str, project_name: str):
        """Test project branches."""
        result = self._api_request("GET", f"/projects/{project_id}/branches")

        if result and "error" not in result:
            branches = result.get("branches", [])
            active_branches = [b for b in branches if b.get("current_state") in ("ready", "idle")]

            self.results.tests.append(TestResult(
                test_type="Neon Branches",
                test_name=f"Branches: {project_name}",
                passed=len(active_branches) > 0,
                message=f"Found {len(branches)} branches ({len(active_branches)} active)",
                details={
                    "total": len(branches),
                    "active": len(active_branches),
                    "branches": [
                        {"name": b["name"], "state": b.get("current_state")}
                        for b in branches
                    ]
                }
            ))
            if len(active_branches) > 0:
                self.results.passed += 1
            else:
                self.results.warnings += 1
        else:
            self.results.tests.append(TestResult(
                test_type="Neon Branches",
                test_name=f"Branches: {project_name}",
                passed=False,
                message=result.get("error", "Failed to list branches")
            ))
            self.results.failed += 1

    def test_endpoints(self, project_id: str, project_name: str):
        """Test project endpoints."""
        result = self._api_request("GET", f"/projects/{project_id}/endpoints")

        if result and "error" not in result:
            endpoints = result.get("endpoints", [])
            active_endpoints = [e for e in endpoints if e.get("current_state") in ("active", "idle")]

            self.results.tests.append(TestResult(
                test_type="Neon Endpoints",
                test_name=f"Endpoints: {project_name}",
                passed=len(active_endpoints) > 0,
                message=f"Found {len(endpoints)} endpoints ({len(active_endpoints)} active)",
                details={
                    "total": len(endpoints),
                    "active": len(active_endpoints),
                    "endpoints": [
                        {
                            "id": e["id"],
                            "host": e.get("host"),
                            "state": e.get("current_state"),
                            "type": e.get("type")
                        }
                        for e in endpoints
                    ]
                }
            ))
            if len(active_endpoints) > 0:
                self.results.passed += 1
            else:
                self.results.warnings += 1

            # Test connectivity to each endpoint
            for endpoint in active_endpoints[:2]:  # Limit to 2
                self.test_endpoint_connectivity(endpoint, project_name)

        else:
            self.results.tests.append(TestResult(
                test_type="Neon Endpoints",
                test_name=f"Endpoints: {project_name}",
                passed=False,
                message=result.get("error", "Failed to list endpoints")
            ))
            self.results.failed += 1

    def test_endpoint_connectivity(self, endpoint: Dict, project_name: str):
        """Test connectivity to a specific endpoint."""
        host = endpoint.get("host")
        endpoint_id = endpoint.get("id")

        if not host:
            return

        # We can't actually connect without credentials, but we can check DNS
        import socket
        try:
            socket.gethostbyname(host)
            self.results.tests.append(TestResult(
                test_type="Neon Connectivity",
                test_name=f"DNS: {host[:30]}...",
                passed=True,
                message="Host resolves successfully",
                details={"host": host, "endpoint_id": endpoint_id}
            ))
            self.results.passed += 1
        except socket.gaierror as e:
            self.results.tests.append(TestResult(
                test_type="Neon Connectivity",
                test_name=f"DNS: {host[:30]}...",
                passed=False,
                message=f"DNS resolution failed: {e}"
            ))
            self.results.failed += 1

    def test_operations(self, project_id: str, project_name: str):
        """Test recent operations on project."""
        result = self._api_request("GET", f"/projects/{project_id}/operations?limit=10")

        if result and "error" not in result:
            operations = result.get("operations", [])
            failed_ops = [o for o in operations if o.get("status") == "error"]

            self.results.tests.append(TestResult(
                test_type="Neon Operations",
                test_name=f"Recent Ops: {project_name}",
                passed=len(failed_ops) == 0,
                message=f"{len(operations)} recent operations ({len(failed_ops)} failed)",
                details={
                    "total": len(operations),
                    "failed": len(failed_ops),
                    "recent": [
                        {
                            "action": o.get("action"),
                            "status": o.get("status"),
                            "created": o.get("created_at")
                        }
                        for o in operations[:5]
                    ]
                }
            ))
            if len(failed_ops) == 0:
                self.results.passed += 1
            else:
                self.results.warnings += 1
        else:
            self.results.tests.append(TestResult(
                test_type="Neon Operations",
                test_name=f"Recent Ops: {project_name}",
                passed=False,
                message=result.get("error", "Failed to list operations")
            ))
            self.results.failed += 1


async def test_database_connection(connection_string: str) -> TestResult:
    """Test actual database connection (requires asyncpg)."""
    if not ASYNCPG_AVAILABLE:
        return TestResult(
            test_type="Neon Connection",
            test_name="Database Connection",
            passed=False,
            message="asyncpg not installed"
        )

    try:
        conn = await asyncpg.connect(connection_string, timeout=10)

        # Test simple query
        result = await conn.fetchval("SELECT version()")
        await conn.close()

        return TestResult(
            test_type="Neon Connection",
            test_name="Database Connection",
            passed=True,
            message="Connection successful",
            details={"version": result}
        )
    except Exception as e:
        return TestResult(
            test_type="Neon Connection",
            test_name="Database Connection",
            passed=False,
            message=str(e)
        )


def main():
    """Run Neon tests from command line."""
    import argparse

    parser = argparse.ArgumentParser(description="Neon Database Tests")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--connection", help="Test specific connection string")
    args = parser.parse_args()

    tester = NeonTester()
    results = tester.run_all()

    # Test specific connection if provided
    if args.connection:
        conn_result = asyncio.run(test_database_connection(args.connection))
        results.tests.append(conn_result)
        if conn_result.passed:
            results.passed += 1
        else:
            results.failed += 1

    if args.json:
        output = {
            "passed": results.passed,
            "failed": results.failed,
            "skipped": results.skipped,
            "warnings": results.warnings,
            "tests": [
                {
                    "type": t.test_type,
                    "name": t.test_name,
                    "passed": t.passed,
                    "message": t.message,
                    "details": t.details
                }
                for t in results.tests
            ]
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\nNeon Test Results:")
        print(f"  Passed: {results.passed}")
        print(f"  Failed: {results.failed}")
        print(f"  Skipped: {results.skipped}")
        print(f"  Warnings: {results.warnings}")
        print("\nTests:")
        for test in results.tests:
            status = "PASS" if test.passed else "FAIL"
            print(f"  [{status}] {test.test_type}: {test.test_name} - {test.message}")


if __name__ == "__main__":
    main()
