#!/usr/bin/env python3
"""Configuration loader for AfterDark Validation Kit."""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from dotenv import load_dotenv


@dataclass
class ApiConfig:
    """API configuration container."""
    enabled: bool = True
    api_url: Optional[str] = None
    secrets: Dict[str, str] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)


class ConfigLoader:
    """Load and manage validation kit configuration."""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path) if config_path else self._default_config_path()
        self.config: Dict[str, Any] = {}
        self.secrets: Dict[str, Dict[str, str]] = {}

    def _default_config_path(self) -> Path:
        return Path(__file__).parent.parent.parent / "config.json"

    def load(self) -> Dict[str, Any]:
        """Load configuration from file and environment."""
        # Load .env file
        env_path = self.config_path.parent / ".env"
        load_dotenv(env_path)

        # Load config file
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = {"apis": {}, "sites": [], "tests": {}}

        # Load secrets from environment
        self._load_secrets()

        return self.config

    def _load_secrets(self):
        """Load secrets from environment variables."""
        api_configs = self.config.get("apis", {})

        for api_name, api_config in api_configs.items():
            self.secrets[api_name] = {}

            for key, value in api_config.items():
                if key.endswith("_env") and isinstance(value, str):
                    env_value = os.getenv(value)
                    if env_value:
                        secret_key = key.replace("_env", "")
                        self.secrets[api_name][secret_key] = env_value

        # Also load from config.api_keys
        if "api_keys" in self.config:
            for api_name, keys in self.config["api_keys"].items():
                if api_name not in self.secrets:
                    self.secrets[api_name] = {}
                self.secrets[api_name].update(keys)

    def get_api_config(self, api_name: str) -> ApiConfig:
        """Get configuration for a specific API."""
        base_config = self.config.get("apis", {}).get(api_name, {})
        secrets = self.secrets.get(api_name, {})

        return ApiConfig(
            enabled=base_config.get("enabled", True),
            api_url=base_config.get("api_url"),
            secrets=secrets,
            extra={k: v for k, v in base_config.items()
                   if k not in ("enabled", "api_url") and not k.endswith("_env")}
        )

    def get_sites(self) -> list:
        """Get list of sites to test."""
        return self.config.get("sites", [])

    def get_test_config(self, test_type: str) -> Dict[str, Any]:
        """Get configuration for a specific test type."""
        return self.config.get("tests", {}).get(test_type, {"enabled": True})

    def get_environment(self, env_name: str = "production") -> Dict[str, str]:
        """Get environment configuration."""
        return self.config.get("environments", {}).get(env_name, {})

    def save(self):
        """Save current configuration to file."""
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=2)


# Global config instance
_config = None


def get_config() -> ConfigLoader:
    """Get global configuration instance."""
    global _config
    if _config is None:
        _config = ConfigLoader()
        _config.load()
    return _config
