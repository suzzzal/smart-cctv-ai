import jwt
import os
from datetime import datetime, timedelta
from typing import Dict, Optional
from passlib.context import CryptContext


class AuthHandler:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "secret")
        self.algorithm = "HS256"
        self.expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(self, password: str) -> str:
        return self.context.hash(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        return self.context.verify(password, hashed)

    def create_access_token(self, data: Dict, expires: Optional[timedelta] = None) -> str:
        payload = data.copy()

        if expires:
            expire_time = datetime.utcnow() + expires
        else:
            expire_time = datetime.utcnow() + timedelta(minutes=self.expire_minutes)

        payload["exp"] = expire_time
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token

    def decode_token(self, token: str) -> Dict:
        payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        return payload

    def create_refresh_token(self, data: Dict) -> str:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + timedelta(days=7)
        payload["type"] = "refresh"
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token

    def verify_refresh_token(self, token: str) -> Dict:
        payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")

        return payload
