from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    pve_host: str = os.getenv("PVE_HOST")
    pve_user: str = os.getenv("PVE_USER")
    pve_password: str = os.getenv("PVE_PASSWORD")
    verify_ssl: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
