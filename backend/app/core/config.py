from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    pve_host: str = os.getenv("PVE_HOST", "your_proxmox_host_ip_or_domain")
    pve_user: str = os.getenv("PVE_USER", "your_user@pam")
    pve_password: str = os.getenv("PVE_PASSWORD", "your_password")
    verify_ssl: bool = False
    api_key: str = os.getenv("API_KEY", "a_very_secret_api_key_12345")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:4200")

    class Config:
        env_file = ".env"

settings = Settings()
