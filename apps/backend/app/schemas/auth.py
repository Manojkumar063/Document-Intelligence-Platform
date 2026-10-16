from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class SessionResponse(BaseModel):
    authenticated: bool = True


# Kept for API consumers and existing tests. Browser login now uses SessionResponse
# and receives the credential only through the HttpOnly cookie.
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
