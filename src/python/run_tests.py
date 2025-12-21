#!/usr/bin/env python3
"""Main test runner for AfterDark Validation Kit - Python tests."""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from dataclasses import asdict

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

from .config import get_config, ConfigLoader
from .oci_tester import OciTester
from .neon_tester import NeonTester


console = Console()


class ValidationRunner:
    """Main validation test runner."""

    def __init__(self, config_path: str = None):
        if config_path:
            self.config = ConfigLoader(config_path)
            self.config.load()
        else:
            self.config = get_config()

        self.results = {
            "timestamp": datetime.now().isoformat(),
            "summary": {"passed": 0, "failed": 0, "skipped": 0, "warnings": 0},
            "tests": {}
        }

    def run_all(self, verbose: bool = False) -> Dict[str, Any]:
        """Run all tests."""
        with console.status("[bold blue]Running validation tests..."):
            self.run_oci_tests(verbose)
            self.run_neon_tests(verbose)

        return self.results

    def run_oci_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run Oracle Cloud Infrastructure tests."""
        console.print("\n[bold cyan]Running OCI Tests...[/]")

        tester = OciTester(self.config)
        results = tester.run_all()

        self.results["tests"]["oci"] = {
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

        self._update_summary(results)
        self._print_results("OCI", results, verbose)

        return self.results["tests"]["oci"]

    def run_neon_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run Neon database tests."""
        console.print("\n[bold cyan]Running Neon Tests...[/]")

        tester = NeonTester(self.config)
        results = tester.run_all()

        self.results["tests"]["neon"] = {
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

        self._update_summary(results)
        self._print_results("Neon", results, verbose)

        return self.results["tests"]["neon"]

    def _update_summary(self, results):
        """Update summary counts."""
        self.results["summary"]["passed"] += results.passed
        self.results["summary"]["failed"] += results.failed
        self.results["summary"]["skipped"] += results.skipped
        self.results["summary"]["warnings"] += results.warnings

    def _print_results(self, category: str, results, verbose: bool):
        """Print test results."""
        # Create status table
        table = Table(title=f"{category} Test Results")
        table.add_column("Type", style="cyan")
        table.add_column("Test", style="white")
        table.add_column("Status", style="bold")
        table.add_column("Message", style="dim")

        for test in results.tests:
            status = "[green]PASS[/]" if test.passed else "[red]FAIL[/]"
            table.add_row(
                test.test_type,
                test.test_name,
                status,
                test.message[:50] + "..." if len(test.message) > 50 else test.message
            )

        console.print(table)

        # Print summary
        summary = Panel(
            f"[green]Passed: {results.passed}[/] | "
            f"[red]Failed: {results.failed}[/] | "
            f"[yellow]Warnings: {results.warnings}[/] | "
            f"[blue]Skipped: {results.skipped}[/]",
            title=f"{category} Summary"
        )
        console.print(summary)

    def print_final_summary(self):
        """Print final summary of all tests."""
        summary = self.results["summary"]

        console.print("\n")
        panel = Panel(
            f"[bold green]Passed: {summary['passed']}[/]\n"
            f"[bold red]Failed: {summary['failed']}[/]\n"
            f"[bold yellow]Warnings: {summary['warnings']}[/]\n"
            f"[bold blue]Skipped: {summary['skipped']}[/]",
            title="[bold]Final Test Summary[/]",
            border_style="blue"
        )
        console.print(panel)

    def save_results(self, output_path: str = None):
        """Save results to JSON file."""
        if output_path is None:
            reports_dir = Path(__file__).parent.parent.parent / "reports"
            reports_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_path = reports_dir / f"python-tests-{timestamp}.json"

        with open(output_path, "w") as f:
            json.dump(self.results, f, indent=2, default=str)

        console.print(f"\n[green]Results saved to: {output_path}[/]")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="AfterDark Validation Kit - Python Tests"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Run all tests"
    )
    parser.add_argument(
        "--oci",
        action="store_true",
        help="Run OCI tests only"
    )
    parser.add_argument(
        "--neon",
        action="store_true",
        help="Run Neon tests only"
    )
    parser.add_argument(
        "--config", "-c",
        help="Path to config file"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file for results"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )

    args = parser.parse_args()

    # Print header
    console.print(Panel.fit(
        "[bold blue]AfterDark Validation Kit[/]\n"
        "[dim]Python Infrastructure Tests[/]",
        border_style="blue"
    ))

    runner = ValidationRunner(args.config)

    try:
        if args.all or (not args.oci and not args.neon):
            runner.run_all(args.verbose)
        else:
            if args.oci:
                runner.run_oci_tests(args.verbose)
            if args.neon:
                runner.run_neon_tests(args.verbose)

        if args.json:
            print(json.dumps(runner.results, indent=2, default=str))
        else:
            runner.print_final_summary()
            runner.save_results(args.output)

        # Exit with error code if tests failed
        if runner.results["summary"]["failed"] > 0:
            sys.exit(1)

    except KeyboardInterrupt:
        console.print("\n[yellow]Tests interrupted by user[/]")
        sys.exit(130)
    except Exception as e:
        console.print(f"\n[red]Error: {e}[/]")
        if args.verbose:
            import traceback
            console.print(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
