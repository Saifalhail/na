#!/usr/bin/env python3
"""
Automated test monitoring script for Nutrition AI backend.
This script runs tests every 15 minutes and updates test status.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


def run_tests():
    """Run the test suite and return results."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Running tests...")

    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    # Run tests with minimal output
    try:
        result = subprocess.run(
            [
                "venv/Scripts/python.exe",
                "-m",
                "pytest",
                "--tb=no",
                "-q",
                "--disable-warnings",
            ],
            capture_output=True,
            text=True,
            timeout=300,
            encoding="utf-8",
            errors="ignore",
        )

        # Parse the output
        output_lines = result.stdout.split("\n")
        summary_line = None

        for line in output_lines:
            if "failed" in line and "passed" in line:
                summary_line = line
                break

        if summary_line:
            # Extract numbers from summary line
            parts = summary_line.split()
            failed = 0
            passed = 0
            errors = 0

            for i, part in enumerate(parts):
                if part == "failed,":
                    failed = int(parts[i - 1])
                elif part == "passed,":
                    passed = int(parts[i - 1])
                elif part == "errors":
                    errors = int(parts[i - 1])

            total = failed + passed + errors

            return {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "output": result.stdout,
                "return_code": result.returncode,
                "timestamp": datetime.now().isoformat(),
            }
        else:
            return {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "errors": 0,
                "output": result.stdout,
                "return_code": result.returncode,
                "timestamp": datetime.now().isoformat(),
                "error": "Could not parse test results",
            }

    except subprocess.TimeoutExpired:
        return {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "output": "Tests timed out after 5 minutes",
            "return_code": -1,
            "timestamp": datetime.now().isoformat(),
            "error": "Timeout",
        }
    except Exception as e:
        return {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "output": str(e),
            "return_code": -1,
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
        }


def update_test_status(results):
    """Update the TEST_STATUS.md file with new results."""

    # Calculate percentages
    total = results["total"]
    if total > 0:
        passed_pct = (results["passed"] / total) * 100
        failed_pct = (results["failed"] / total) * 100
        errors_pct = (results["errors"] / total) * 100
    else:
        passed_pct = failed_pct = errors_pct = 0

    # Read current status file
    try:
        with open("TEST_STATUS.md", "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        content = ""

    # Update the metrics section
    new_metrics = f"""## Current Test Metrics
- **Total Tests**: {total}
- **Passing**: {results['passed']} ({passed_pct:.1f}%) {'✅' if passed_pct > 50 else '⚠️'}
- **Failing**: {results['failed']} ({failed_pct:.1f}%) {'❌' if results['failed'] > 0 else '✅'}
- **Errors**: {results['errors']} ({errors_pct:.1f}%) {'🔴' if results['errors'] > 0 else '✅'}
- **Last Run**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""

    # Replace the metrics section
    lines = content.split("\n")
    new_lines = []
    in_metrics = False

    for line in lines:
        if line.startswith("## Current Test Metrics"):
            in_metrics = True
            new_lines.append(new_metrics)
        elif in_metrics and line.startswith("##"):
            in_metrics = False
            new_lines.append(line)
        elif not in_metrics:
            new_lines.append(line)

    # Write back the file
    with open("TEST_STATUS.md", "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Test status updated")


def log_results(results):
    """Log test results to a file."""
    log_file = Path("test_monitor.log")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Calculate improvement indicators
    total = results["total"]
    if total > 0:
        pass_rate = (results["passed"] / total) * 100
        error_rate = (results["errors"] / total) * 100

        # Status indicators
        status = (
            "🔴 CRITICAL"
            if results["errors"] > 0
            else "⚠️ NEEDS WORK" if pass_rate < 70 else "✅ GOOD"
        )

        log_entry = f"[{timestamp}] {status} - {results['passed']}/{total} passed ({pass_rate:.1f}%), {results['failed']} failed, {results['errors']} errors"
    else:
        log_entry = f"[{timestamp}] No tests found or execution failed"

    if results.get("error"):
        log_entry += f" - ERROR: {results['error']}"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(log_entry + "\n")

    print(log_entry)


def monitor_tests():
    """Main monitoring loop."""
    print("Starting test monitoring...")
    print("Running tests every 15 minutes. Press Ctrl+C to stop.")

    try:
        while True:
            results = run_tests()
            update_test_status(results)
            log_results(results)

            # Sleep for 15 minutes
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Sleeping for 15 minutes...")
            time.sleep(900)  # 15 minutes = 900 seconds

    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")
    except Exception as e:
        print(f"Monitor error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    monitor_tests()
