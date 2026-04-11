from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from services.data_store import store
from utils.jwt_handler import create_access_token

router = APIRouter()


class FirebaseAuthRequest(BaseModel):
    id_token: str = Field(min_length=10)


class UserInfo(BaseModel):
    id: int
    email: str
    name: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo


class EmailLoginRequest(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)


class EmailRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)


@router.post("/login", response_model=AuthResponse)
async def email_login(request: EmailLoginRequest) -> Dict[str, Any]:
    if not store.is_email_registered(request.email):
        raise HTTPException(
            status_code=401,
            detail="No account found for this email. Please register first.",
        )

    profile = store.update_profile(
        {
            "email": request.email,
            "name": request.email.split("@")[0].replace(".", " ").title(),
        }
    )
    access_token = create_access_token({"sub": 1, "email": profile.get("email")})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": 1,
            "email": profile.get("email"),
            "name": profile.get("name"),
        },
    }


@router.post("/register", response_model=AuthResponse)
async def email_register(request: EmailRegisterRequest) -> Dict[str, Any]:
    profile = store.update_profile(
        {
            "name": request.name,
            "email": request.email,
        }
    )
    # Mark this email as registered for future logins.
    store.register_email(request.email)
    access_token = create_access_token({"sub": 1, "email": profile.get("email")})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": 1,
            "email": profile.get("email"),
            "name": profile.get("name"),
        },
    }


@router.post("/google", response_model=AuthResponse)
async def google_login_firebase(
    request: FirebaseAuthRequest,
) -> Dict[str, Any]:
    # Use Firebase to verify the Google ID token, then mirror
    # the in-memory profile behaviour of the email login endpoints.
    try:
        from utils.firebase_auth import verify_firebase_token

        firebase_data = verify_firebase_token(request.id_token)
        email = firebase_data.get("email")
        name = firebase_data.get("name")

        if not email:
            raise HTTPException(
                status_code=401,
                detail="Firebase token did not contain an email address.",
            )

        profile = store.update_profile(
            {
                "email": email,
                "name": name,
            }
        )

        # Auto-register this email so that future email/password logins
        # recognise it as a known account.
        store.register_email(email)

        access_token = create_access_token({"sub": 1, "email": profile.get("email")})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": 1,
                "email": profile.get("email"),
                "name": profile.get("name"),
            },
        }
    except HTTPException:
        # Re-raise explicit HTTP errors as-is
        raise
    except ValueError as exc:
        # Token verification problems
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        # Any other unexpected error
        raise HTTPException(status_code=500, detail=f"Authentication failed: {exc}") from exc
