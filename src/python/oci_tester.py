#!/usr/bin/env python3
"""Oracle Cloud Infrastructure (OCI) testing module."""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

try:
    import oci
    OCI_AVAILABLE = True
except ImportError:
    OCI_AVAILABLE = False

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
class OciTestResults:
    """Aggregated OCI test results."""
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    warnings: int = 0
    tests: List[TestResult] = field(default_factory=list)


class OciTester:
    """Oracle Cloud Infrastructure testing class."""

    def __init__(self, config: Optional[ConfigLoader] = None):
        self.config = config or get_config()
        self.results = OciTestResults()
        self.oci_config = None
        self.clients = {}

    def initialize(self) -> bool:
        """Initialize OCI SDK with configuration."""
        if not OCI_AVAILABLE:
            self.results.tests.append(TestResult(
                test_type="OCI",
                test_name="SDK Available",
                passed=False,
                message="OCI SDK not installed. Run: pip install oci"
            ))
            self.results.failed += 1
            return False

        oci_api_config = self.config.get_api_config("oracle_cloud")

        try:
            # Build OCI config from our config
            self.oci_config = {
                "tenancy": oci_api_config.secrets.get("tenancy_ocid") or
                          oci_api_config.extra.get("tenancy_ocid"),
                "user": oci_api_config.secrets.get("user_ocid") or
                       oci_api_config.extra.get("user_ocid"),
                "fingerprint": oci_api_config.secrets.get("fingerprint") or
                              oci_api_config.extra.get("fingerprint"),
                "key_file": oci_api_config.secrets.get("private_key_path") or
                           oci_api_config.extra.get("private_key_path"),
                "region": oci_api_config.extra.get("region", "us-ashburn-1"),
            }

            # Check if we have all required fields
            required_fields = ["tenancy", "user", "fingerprint", "key_file"]
            missing_fields = [f for f in required_fields if not self.oci_config.get(f)]

            if missing_fields:
                self.results.tests.append(TestResult(
                    test_type="OCI",
                    test_name="Configuration",
                    passed=False,
                    message=f"Missing required fields: {missing_fields}"
                ))
                self.results.skipped += 1
                return False

            # Validate config
            oci.config.validate_config(self.oci_config)

            self.results.tests.append(TestResult(
                test_type="OCI",
                test_name="Configuration Valid",
                passed=True,
                message="OCI configuration validated successfully"
            ))
            self.results.passed += 1
            return True

        except Exception as e:
            self.results.tests.append(TestResult(
                test_type="OCI",
                test_name="Configuration",
                passed=False,
                message=str(e)
            ))
            self.results.failed += 1
            return False

    def run_all(self) -> OciTestResults:
        """Run all OCI tests."""
        if not self.initialize():
            return self.results

        # Run test categories
        self.test_identity()
        self.test_compute()
        self.test_networking()
        self.test_database()
        self.test_object_storage()
        self.test_container_engine()
        self.test_load_balancer()

        return self.results

    def _get_client(self, client_class: type, name: str):
        """Get or create an OCI client."""
        if name not in self.clients:
            try:
                self.clients[name] = client_class(self.oci_config)
            except Exception as e:
                self.results.tests.append(TestResult(
                    test_type="OCI",
                    test_name=f"Client: {name}",
                    passed=False,
                    message=str(e)
                ))
                self.results.failed += 1
                return None
        return self.clients[name]

    def test_identity(self):
        """Test OCI Identity service."""
        if not OCI_AVAILABLE:
            return

        identity = self._get_client(oci.identity.IdentityClient, "identity")
        if not identity:
            return

        try:
            # Get compartments
            compartment_id = self.oci_config.get("tenancy")
            compartments = identity.list_compartments(
                compartment_id,
                compartment_id_in_subtree=True
            ).data

            self.results.tests.append(TestResult(
                test_type="OCI Identity",
                test_name="List Compartments",
                passed=True,
                message=f"Found {len(compartments)} compartments",
                details={"count": len(compartments)}
            ))
            self.results.passed += 1

            # Get users
            users = identity.list_users(compartment_id).data
            self.results.tests.append(TestResult(
                test_type="OCI Identity",
                test_name="List Users",
                passed=True,
                message=f"Found {len(users)} users",
                details={"count": len(users)}
            ))
            self.results.passed += 1

        except oci.exceptions.ServiceError as e:
            self.results.tests.append(TestResult(
                test_type="OCI Identity",
                test_name="Identity Tests",
                passed=False,
                message=f"Service error: {e.message}"
            ))
            self.results.failed += 1

    def test_compute(self):
        """Test OCI Compute service."""
        if not OCI_AVAILABLE:
            return

        compute = self._get_client(oci.core.ComputeClient, "compute")
        if not compute:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # List instances
            instances = compute.list_instances(compartment_id).data

            running_instances = [i for i in instances if i.lifecycle_state == "RUNNING"]
            stopped_instances = [i for i in instances if i.lifecycle_state == "STOPPED"]

            self.results.tests.append(TestResult(
                test_type="OCI Compute",
                test_name="List Instances",
                passed=True,
                message=f"Found {len(instances)} instances ({len(running_instances)} running)",
                details={
                    "total": len(instances),
                    "running": len(running_instances),
                    "stopped": len(stopped_instances)
                }
            ))
            self.results.passed += 1

            # Check instance health
            for instance in running_instances[:5]:  # Check first 5
                try:
                    vnic_attachments = compute.list_vnic_attachments(
                        compartment_id,
                        instance_id=instance.id
                    ).data

                    self.results.tests.append(TestResult(
                        test_type="OCI Compute",
                        test_name=f"Instance: {instance.display_name}",
                        passed=True,
                        message=f"Instance healthy with {len(vnic_attachments)} VNICs",
                        details={
                            "id": instance.id,
                            "shape": instance.shape,
                            "vnics": len(vnic_attachments)
                        }
                    ))
                    self.results.passed += 1
                except Exception as e:
                    self.results.warnings += 1

        except oci.exceptions.ServiceError as e:
            self.results.tests.append(TestResult(
                test_type="OCI Compute",
                test_name="Compute Tests",
                passed=False,
                message=f"Service error: {e.message}"
            ))
            self.results.failed += 1

    def test_networking(self):
        """Test OCI Networking service."""
        if not OCI_AVAILABLE:
            return

        network = self._get_client(oci.core.VirtualNetworkClient, "network")
        if not network:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # List VCNs
            vcns = network.list_vcns(compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Networking",
                test_name="List VCNs",
                passed=True,
                message=f"Found {len(vcns)} VCNs",
                details={
                    "count": len(vcns),
                    "vcns": [{"name": v.display_name, "state": v.lifecycle_state} for v in vcns]
                }
            ))
            self.results.passed += 1

            # Check each VCN
            for vcn in vcns[:3]:  # Check first 3
                subnets = network.list_subnets(compartment_id, vcn_id=vcn.id).data

                self.results.tests.append(TestResult(
                    test_type="OCI Networking",
                    test_name=f"VCN: {vcn.display_name}",
                    passed=vcn.lifecycle_state == "AVAILABLE",
                    message=f"VCN has {len(subnets)} subnets",
                    details={
                        "id": vcn.id,
                        "state": vcn.lifecycle_state,
                        "subnets": len(subnets)
                    }
                ))
                if vcn.lifecycle_state == "AVAILABLE":
                    self.results.passed += 1
                else:
                    self.results.warnings += 1

        except oci.exceptions.ServiceError as e:
            self.results.tests.append(TestResult(
                test_type="OCI Networking",
                test_name="Networking Tests",
                passed=False,
                message=f"Service error: {e.message}"
            ))
            self.results.failed += 1

    def test_database(self):
        """Test OCI Database service."""
        if not OCI_AVAILABLE:
            return

        db = self._get_client(oci.database.DatabaseClient, "database")
        if not db:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # List Autonomous Databases
            adbs = db.list_autonomous_databases(compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Database",
                test_name="List Autonomous Databases",
                passed=True,
                message=f"Found {len(adbs)} autonomous databases",
                details={"count": len(adbs)}
            ))
            self.results.passed += 1

            # Check each ADB
            for adb in adbs[:3]:
                is_available = adb.lifecycle_state == "AVAILABLE"
                self.results.tests.append(TestResult(
                    test_type="OCI Database",
                    test_name=f"ADB: {adb.display_name}",
                    passed=is_available,
                    message=f"State: {adb.lifecycle_state}",
                    details={
                        "id": adb.id,
                        "state": adb.lifecycle_state,
                        "db_version": adb.db_version
                    }
                ))
                if is_available:
                    self.results.passed += 1
                else:
                    self.results.warnings += 1

        except oci.exceptions.ServiceError as e:
            if e.status == 404:
                self.results.tests.append(TestResult(
                    test_type="OCI Database",
                    test_name="Database Tests",
                    passed=True,
                    message="No databases configured"
                ))
                self.results.passed += 1
            else:
                self.results.tests.append(TestResult(
                    test_type="OCI Database",
                    test_name="Database Tests",
                    passed=False,
                    message=f"Service error: {e.message}"
                ))
                self.results.failed += 1

    def test_object_storage(self):
        """Test OCI Object Storage service."""
        if not OCI_AVAILABLE:
            return

        os_client = self._get_client(oci.object_storage.ObjectStorageClient, "object_storage")
        if not os_client:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # Get namespace
            namespace = os_client.get_namespace(compartment_id=compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Object Storage",
                test_name="Get Namespace",
                passed=True,
                message=f"Namespace: {namespace}"
            ))
            self.results.passed += 1

            # List buckets
            buckets = os_client.list_buckets(namespace, compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Object Storage",
                test_name="List Buckets",
                passed=True,
                message=f"Found {len(buckets)} buckets",
                details={
                    "count": len(buckets),
                    "buckets": [b.name for b in buckets]
                }
            ))
            self.results.passed += 1

        except oci.exceptions.ServiceError as e:
            self.results.tests.append(TestResult(
                test_type="OCI Object Storage",
                test_name="Object Storage Tests",
                passed=False,
                message=f"Service error: {e.message}"
            ))
            self.results.failed += 1

    def test_container_engine(self):
        """Test OCI Container Engine for Kubernetes (OKE)."""
        if not OCI_AVAILABLE:
            return

        ce = self._get_client(oci.container_engine.ContainerEngineClient, "container_engine")
        if not ce:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # List clusters
            clusters = ce.list_clusters(compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Container Engine",
                test_name="List Clusters",
                passed=True,
                message=f"Found {len(clusters)} OKE clusters",
                details={"count": len(clusters)}
            ))
            self.results.passed += 1

            # Check each cluster
            for cluster in clusters:
                is_active = cluster.lifecycle_state == "ACTIVE"
                self.results.tests.append(TestResult(
                    test_type="OCI Container Engine",
                    test_name=f"Cluster: {cluster.name}",
                    passed=is_active,
                    message=f"State: {cluster.lifecycle_state}",
                    details={
                        "id": cluster.id,
                        "state": cluster.lifecycle_state,
                        "kubernetes_version": cluster.kubernetes_version
                    }
                ))
                if is_active:
                    self.results.passed += 1
                else:
                    self.results.warnings += 1

        except oci.exceptions.ServiceError as e:
            if e.status == 404:
                self.results.tests.append(TestResult(
                    test_type="OCI Container Engine",
                    test_name="Container Engine Tests",
                    passed=True,
                    message="No OKE clusters configured"
                ))
                self.results.passed += 1
            else:
                self.results.tests.append(TestResult(
                    test_type="OCI Container Engine",
                    test_name="Container Engine Tests",
                    passed=False,
                    message=f"Service error: {e.message}"
                ))
                self.results.failed += 1

    def test_load_balancer(self):
        """Test OCI Load Balancer service."""
        if not OCI_AVAILABLE:
            return

        lb = self._get_client(oci.load_balancer.LoadBalancerClient, "load_balancer")
        if not lb:
            return

        oci_api_config = self.config.get_api_config("oracle_cloud")
        compartment_id = oci_api_config.secrets.get("compartment_ocid") or \
                        oci_api_config.extra.get("compartment_ocid") or \
                        self.oci_config.get("tenancy")

        try:
            # List load balancers
            lbs = lb.list_load_balancers(compartment_id).data

            self.results.tests.append(TestResult(
                test_type="OCI Load Balancer",
                test_name="List Load Balancers",
                passed=True,
                message=f"Found {len(lbs)} load balancers",
                details={"count": len(lbs)}
            ))
            self.results.passed += 1

            # Check each LB
            for load_balancer in lbs:
                is_active = load_balancer.lifecycle_state == "ACTIVE"

                # Get backend health
                backend_sets = list(load_balancer.backend_sets.keys()) if load_balancer.backend_sets else []

                self.results.tests.append(TestResult(
                    test_type="OCI Load Balancer",
                    test_name=f"LB: {load_balancer.display_name}",
                    passed=is_active,
                    message=f"State: {load_balancer.lifecycle_state}, {len(backend_sets)} backend sets",
                    details={
                        "id": load_balancer.id,
                        "state": load_balancer.lifecycle_state,
                        "backend_sets": backend_sets,
                        "ip_addresses": [ip.ip_address for ip in load_balancer.ip_addresses] if load_balancer.ip_addresses else []
                    }
                ))
                if is_active:
                    self.results.passed += 1
                else:
                    self.results.warnings += 1

        except oci.exceptions.ServiceError as e:
            if e.status == 404:
                self.results.tests.append(TestResult(
                    test_type="OCI Load Balancer",
                    test_name="Load Balancer Tests",
                    passed=True,
                    message="No load balancers configured"
                ))
                self.results.passed += 1
            else:
                self.results.tests.append(TestResult(
                    test_type="OCI Load Balancer",
                    test_name="Load Balancer Tests",
                    passed=False,
                    message=f"Service error: {e.message}"
                ))
                self.results.failed += 1


def main():
    """Run OCI tests from command line."""
    import argparse

    parser = argparse.ArgumentParser(description="OCI Infrastructure Tests")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    tester = OciTester()
    results = tester.run_all()

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
        print(f"\nOCI Test Results:")
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
