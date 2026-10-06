"""Local FastAPI authentication boundary. All provider tokens stay server-side."""

from services.shared.traveler_profile import profile_context

import hashlib
import secrets
import time
from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock
from typing import Annotated
from uuid import UUID

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr
from starlette.concurrency import run_in_threadpool

from .agent_client import AgentClient
from .authorization import traveler_key
from .cognito_adapter import CognitoAdapter
from .contracts import ValidatedIdentity
from .crud_client import CrudClient
from .session_store import SessionStore
from .token_validator import TokenValidationError

MAX_AGE = 30 * 24 * 60 * 60
ENROLLMENT_AGE = 5 * 60
SIGN_IN_ERROR = "We couldn’t sign you in. Check your details or reset your password."
RECOVERY_MESSAGE = (
    "If this address is eligible, we’ll send instructions. Check your spam folder, "
    "or try again in a few minutes if nothing arrives."
)


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EmailInput(Input):
    email: EmailStr


class SignInInput(EmailInput):
    password: SecretStr = Field(min_length=1, max_length=256)


class RegisterInput(SignInInput):
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)


class VerifyInput(EmailInput):
    code: SecretStr = Field(min_length=1, max_length=64)


class ResetInput(EmailInput):
    code: SecretStr = Field(min_length=1, max_length=64)
    new_password: SecretStr = Field(min_length=8, max_length=256)


class MfaInput(Input):
    code: Annotated[str, Field(pattern=r"^\d{6}$")]


class RecoveryInput(Input):
    code: SecretStr = Field(min_length=8, max_length=64)


def create_app(
    provider: CognitoAdapter | None = None,
    verifier: Callable[[str], ValidatedIdentity] | None = None,
    store: SessionStore | None = None,
    *,
    origin: str = "http://localhost:5173",
    secure_cookies: bool = True,
    clock: Callable[[], float] = time.time,
    crud_client: CrudClient | None = None,
    agent_client: AgentClient | None = None,
    capability_reader: Callable | None = None,
) -> FastAPI:
    app = FastAPI(title="Travella account access", docs_url=None, redoc_url=None)
    cookie = "__Host-travella" if secure_cookies else "travella_local"
    app.state.cookie_name = cookie
    attempts: dict[str, deque] = defaultdict(deque)
    rate_lock = Lock()

    def ready():
        if provider is None or verifier is None or store is None:
            raise HTTPException(503, "Account access is not configured yet.")

    def clear(response: Response):
        response.delete_cookie(
            cookie, path="/", secure=secure_cookies, httponly=True, samesite="strict"
        )

    def set_cookie(response: Response, value: str, age: int):
        response.set_cookie(
            cookie,
            value,
            max_age=age,
            httponly=True,
            secure=secure_cookies,
            samesite="strict",
            path="/",
        )

    @app.middleware("http")
    async def protection(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            if (
                request.headers.get("origin") != origin
                or request.headers.get("x-travella-request") != "1"
            ):
                return JSONResponse({"message": "Request origin rejected."}, status_code=403)
            if request.headers.get("content-type", "").split(";")[0] != "application/json":
                return JSONResponse({"message": "JSON required."}, status_code=415)
            # Reverse proxy must also enforce a body size limit before deployment.
            if len(await request.body()) > 16384:
                return JSONResponse({"message": "Request too large."}, status_code=413)
            if request.url.path != "/auth/sign-out":
                # Local limit; a shared edge limit is needed for production.
                host = request.client.host if request.client else "unknown"
                now = clock()
                with rate_lock:
                    for key in list(attempts):
                        if not attempts[key] or attempts[key][-1] <= now - 60:
                            del attempts[key]
                    queue = attempts[host]
                    while queue and queue[0] <= now - 60:
                        queue.popleft()
                    if len(queue) >= 30:
                        return JSONResponse(
                            {"message": "Please wait a minute and try again."},
                            status_code=429,
                            headers={"Retry-After": "60"},
                        )
                    queue.append(now)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # FastAPI's default errors echo submitted input (including passwords).
        fields = sorted(
            {
                str(e["loc"][-1])
                for e in exc.errors()
                if str(e["loc"][-1]) in {"email", "password", "first_name", "last_name", "code"}
            }
        )
        return JSONResponse(
            {"message": "Check the highlighted fields.", "fields": fields}, status_code=422
        )

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        response = JSONResponse({"message": exc.detail}, status_code=exc.status_code)
        if exc.status_code == 401:
            clear(response)
        return response

    @app.exception_handler(ClientError)
    @app.exception_handler(BotoCoreError)
    async def provider_error(request, exc):
        # Never expose AWS request, token, username, or provider exception text.
        return JSONResponse(
            {"message": "Account access is temporarily unavailable. Try again."}, status_code=503
        )

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "auth_configured": all(x is not None for x in (provider, verifier, store)),
        }

    @app.post("/auth/register")
    def register(data: RegisterInput):
        ready()
        try:
            provider.register(
                data.first_name.strip(),
                data.last_name.strip(),
                str(data.email),
                data.password.get_secret_value(),
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "UsernameExistsException":
                raise HTTPException(
                    400,
                    "Unable to create the account. Check your details and password requirements.",
                ) from None
        return {
            "state": "verify_email",
            "message": "Check your email for confirmation instructions. If you already have an account, sign in.",
        }

    @app.post("/auth/verify-email")
    def confirm(data: VerifyInput):
        ready()
        try:
            provider.confirm_email(str(data.email), data.code.get_secret_value())
        except ClientError:
            raise HTTPException(
                400, "This code could not be used. Check it or request a new one."
            ) from None
        return {"state": "sign_in", "message": "Email verified. Sign in to continue."}

    @app.post("/auth/resend-verification")
    def resend(data: EmailInput):
        ready()
        try:
            provider.resend_confirmation(str(data.email))
        except ClientError:
            pass
        return {"message": RECOVERY_MESSAGE}

    @app.post("/auth/forgot-password")
    def forgot(data: EmailInput):
        ready()
        try:
            provider.forgot_password(str(data.email))
        except ClientError:
            # Unconfirmed users cannot reset. Resend confirmation without
            # exposing which provider path was taken in the response.
            try:
                provider.resend_confirmation(str(data.email))
            except ClientError:
                pass
        return {"state": "neutral_confirmation", "message": RECOVERY_MESSAGE}

    @app.post("/auth/reset-password")
    def reset_password(data: ResetInput):
        ready()
        email = str(data.email)
        try:
            provider.reset_password(
                email, data.code.get_secret_value(), data.new_password.get_secret_value()
            )
        except ClientError:
            raise HTTPException(
                400, "This reset code could not be used. Request a new one and try again."
            ) from None
        with store.transaction():
            sessions = store.invalidate_account(email)
            for session in sessions:
                try:
                    provider.global_sign_out(session["access"])
                except (ClientError, BotoCoreError):
                    pass
        return {"state": "sign_in", "message": "Password updated. Sign in again to continue."}

    def identity(access: str) -> ValidatedIdentity:
        subject = verifier(access)
        user = provider.get_user(access)  # also checks provider revocation
        attributes = {a["Name"]: a["Value"] for a in user.get("UserAttributes", [])}
        if attributes.get("sub") != subject.subject or attributes.get("email_verified") != "true":
            raise TokenValidationError("Private access requires verified email")
        return subject

    def finish(result: dict, response: Response, email: str):
        tokens = result["AuthenticationResult"]
        principal = identity(tokens["AccessToken"])
        now = clock()
        sid = store.create(
            {
                "kind": "session",
                "subject": principal.subject,
                "email": email,
                "access": tokens["AccessToken"],
                "refresh": tokens["RefreshToken"],
                "started": now,
                "access_expires": principal.expires_at,
            },
            now + MAX_AGE,
            now,
        )
        set_cookie(response, sid, MAX_AGE)
        return {"state": "signed_in", "destination": "/plans"}

    def current_session(request: Request) -> tuple[str, dict, ValidatedIdentity]:
        sid = request.cookies.get(cookie)
        session = store.get(sid, clock())
        if not sid or not session or session.get("kind") != "session":
            raise HTTPException(401, "Sign-in required.")
        if session["access_expires"] <= clock():
            raise HTTPException(401, "Sign-in required.")
        principal = identity(session["access"])
        if principal.subject != session["subject"]:
            raise HTTPException(401, "Sign-in required.")
        return sid, session, principal

    @app.api_route("/v1/plans", methods=["GET", "POST"])
    @app.api_route("/v1/plans/{suffix:path}", methods=["GET", "POST", "PATCH", "DELETE"])
    async def lifecycle_proxy(request: Request):
        ready()
        body = await request.body()

        def forward():
            with store.transaction():
                _, session, _ = current_session(request)
                if crud_client is None:
                    raise HTTPException(503, "Plans are not configured yet.")
                status, data = crud_client.request(
                    request.method,
                    request.url.path,
                    token=session["access"],
                    headers=request.headers,
                    params=request.query_params,
                    body=body,
                )
                response = JSONResponse(data, status_code=status)
                if status == 401:
                    clear(response)
                return response

        return await run_in_threadpool(forward)

    @app.api_route("/v1/traveler-profile", methods=["GET", "PUT"])
    @app.patch("/v1/traveler-profile/onboarding")
    @app.patch("/v1/traveler-profile/sections")
    async def traveler_profile_proxy(request: Request):
        ready()
        body = await request.body()

        def forward():
            with store.transaction():
                _, session, _ = current_session(request)
                token = session["access"]
            if crud_client is None:
                raise HTTPException(503, "Traveler profile is not configured yet.")
            status, data = crud_client.request(
                request.method,
                request.url.path,
                token=token,
                headers=request.headers,
                params=request.query_params,
                body=body,
            )
            if request.method in {"PUT", "PATCH"} and status == 200 and isinstance(data, dict):
                complete = data.get("onboarding", {}).get("completed_version") == 2
                # Account edits and completed onboarding mirror only advisory fields.
                # The SQL save is already durable if this bounded attempt fails.
                if request.method == "PUT" or complete or request.url.path.endswith("/sections"):
                    try:
                        data["memory_sync"] = (
                            agent_client.sync_profile(token=token, profile=profile_context(data) | {"updated_at": data.get("updated_at")})
                            if agent_client is not None else "not_configured"
                        )
                    except Exception:
                        data["memory_sync"] = "unavailable"
            response = JSONResponse(data, status_code=status)
            if status == 401:
                clear(response)
            return response

        return await run_in_threadpool(forward)

    @app.post("/v1/agent/plans/{plan_id}/events")
    async def agent_proxy(plan_id: str, request: Request):
        ready()
        body = await request.body()

        def access_token():
            with store.transaction():
                _, session, _ = current_session(request)
                return session["access"]

        token = await run_in_threadpool(access_token)
        if agent_client is None:
            raise HTTPException(503, "Copilot is not configured yet.")
        try:
            UUID(plan_id)
        except ValueError:
            raise HTTPException(404, "Copilot is unavailable.") from None
        status, data = await run_in_threadpool(
            agent_client.turn,
            request.url.path,
            token=token,
            body=body,
        )
        return JSONResponse(data, status_code=status)

    @app.post("/v1/agent/onboarding/events")
    async def onboarding_agent_proxy(request: Request):
        ready()
        body = await request.body()

        def access_token():
            with store.transaction():
                _, session, _ = current_session(request)
                return session["access"]

        token = await run_in_threadpool(access_token)
        if agent_client is None:
            raise HTTPException(503, "Onboarding is not configured yet.")
        status, data = await run_in_threadpool(
            agent_client.onboarding, token=token, body=body
        )
        return JSONResponse(data, status_code=status)

    @app.post("/v1/agent/plans/{plan_id}/events/stream")
    async def agent_proxy_stream(plan_id: str, request: Request):
        ready()
        body = await request.body()

        def access_token():
            with store.transaction():
                _, session, _ = current_session(request)
                return session["access"]

        token = await run_in_threadpool(access_token)
        if agent_client is None:
            raise HTTPException(503, "Copilot is not configured yet.")
        try:
            UUID(plan_id)
        except ValueError:
            raise HTTPException(404, "Copilot is unavailable.") from None
        return StreamingResponse(
            agent_client.stream(
                f"/v1/agent/plans/{plan_id}/events/stream",
                token=token,
                body=body,
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    @app.post("/v1/agent/plans/{plan_id}/events/{event_id}/cancel")
    async def agent_proxy_cancel(plan_id: str, event_id: str, request: Request):
        ready()

        def access_token():
            with store.transaction():
                _, session, _ = current_session(request)
                return session["access"]

        token = await run_in_threadpool(access_token)
        if agent_client is None:
            raise HTTPException(503, "Copilot is not configured yet.")
        try:
            UUID(plan_id)
        except ValueError:
            raise HTTPException(404, "Copilot is unavailable.") from None
        status, data = await run_in_threadpool(
            agent_client.cancel,
            f"/v1/agent/plans/{plan_id}/events/{event_id}/cancel",
            token=token,
        )
        if status == 200 and data.get("cancelled") and getattr(agent_client, "runtime_arn", None) and crud_client:
            released = await run_in_threadpool(crud_client.cancel_research_run, plan_id, event_id, token=token)
            if not released:
                return JSONResponse({"message": "The reply stopped, but the Trip Brief is still unlocking. Try again shortly."}, status_code=503)
        return JSONResponse(data, status_code=status)

    @app.get("/private/probe")
    def private_probe(request: Request):
        """Walking-skeleton private handler; ownership comes only from the session subject."""
        ready()
        with store.transaction():
            _, _, principal = current_session(request)
            traveler_key(principal)
            return {"state": "authorized", "destination": "/plans"}

    @app.post("/auth/mfa/enrollment/start")
    def start_enrollment(request: Request):
        ready()
        with store.transaction():
            _, session, principal = current_session(request)
            result = provider.associate_software_token(access_token=session["access"])
            enrollment_session = result.get("Session")
            secret_code = result.get("SecretCode")
            if not enrollment_session or not secret_code:
                raise HTTPException(503, "Authenticator setup is temporarily unavailable.")
            store.put_enrollment(
                principal.subject,
                {"session": enrollment_session, "access": session["access"]},
                clock() + ENROLLMENT_AGE,
            )
            return {
                "state": "mfa_enrollment",
                "secret_code": secret_code,
                "otpauth_uri": f"otpauth://totp/Travella?secret={secret_code}&issuer=Travella",
            }

    @app.post("/auth/mfa/enrollment/verify")
    def verify_enrollment(data: MfaInput, request: Request):
        ready()
        with store.transaction():
            _, session, principal = current_session(request)
            enrollment = store.get_enrollment(principal.subject, clock())
            if not enrollment:
                raise HTTPException(400, "Authenticator setup expired. Start again.")
            try:
                result = provider.verify_software_token(data.code, access_token=session["access"])
                if result.get("Status") != "SUCCESS":
                    raise ValueError("Authenticator code rejected")
            except (ClientError, BotoCoreError, ValueError):
                store.delete_enrollment(principal.subject)
                raise HTTPException(400, "Authenticator code could not be verified.") from None
            codes = [secrets.token_hex(4).upper() for _ in range(10)]
            hashes = [hashlib.sha256(code.encode()).hexdigest() for code in codes]
            store.put_recovery_codes(principal.subject, session["email"], hashes, clock())
            store.delete_enrollment(principal.subject)
            return {"state": "recovery_codes", "codes": codes}

    @app.post("/auth/sign-in")
    def sign_in(data: SignInInput, request: Request, response: Response):
        ready()
        with store.transaction():
            store.delete(request.cookies.get(cookie))
            try:
                result = provider.sign_in(str(data.email), data.password.get_secret_value())
                if result.get("ChallengeName") == "SOFTWARE_TOKEN_MFA":
                    now = clock()
                    username = result.get("ChallengeParameters", {}).get(
                        "USER_ID_FOR_SRP", str(data.email)
                    )
                    sid = store.create(
                        {
                            "kind": "challenge",
                            "session": result["Session"],
                            "username": username,
                            "email": str(data.email),
                        },
                        now + 180,
                        now,
                    )
                    set_cookie(response, sid, 180)
                    return {"state": "mfa_challenge"}
                if "AuthenticationResult" not in result:
                    raise TokenValidationError("Unsupported challenge")
                return finish(result, response, str(data.email))
            except (ClientError, TokenValidationError, KeyError):
                # Raise outside transaction so the deletion commits.
                pass
        raise HTTPException(401, SIGN_IN_ERROR)

    @app.post("/auth/mfa/challenge")
    def mfa(data: MfaInput, request: Request, response: Response):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            challenge = store.get(sid, clock())
            store.delete(sid)  # one-use browser challenge, even on failure
            try:
                if not challenge or challenge["kind"] != "challenge":
                    raise TokenValidationError("Challenge expired")
                result = provider.answer_challenge(
                    challenge["session"],
                    "SOFTWARE_TOKEN_MFA",
                    {
                        "USERNAME": challenge["username"],
                        "SOFTWARE_TOKEN_MFA_CODE": data.code,
                    },
                )
                return finish(result, response, challenge["email"])
            except (ClientError, TokenValidationError, KeyError):
                pass
        raise HTTPException(401, SIGN_IN_ERROR)

    @app.post("/auth/mfa/recovery")
    def recover_mfa(data: RecoveryInput, request: Request, response: Response):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            challenge = store.get(sid, clock())
            store.delete(sid)
            try:
                if not challenge or challenge.get("kind") != "challenge":
                    raise TokenValidationError("Challenge expired")
                subject = store.consume_recovery_code_for_email(
                    challenge["email"],
                    hashlib.sha256(data.code.get_secret_value().encode()).hexdigest(),
                )
                if not subject:
                    raise TokenValidationError("Recovery code rejected")
                result = provider.associate_software_token(session=challenge["session"])
                enrollment_session = result.get("Session")
                secret_code = result.get("SecretCode")
                if not enrollment_session or not secret_code:
                    raise TokenValidationError("Replacement setup unavailable")
                recovery_sid = store.create(
                    {
                        "kind": "recovery_enrollment",
                        "subject": subject,
                        "email": challenge["email"],
                        "username": challenge["username"],
                        "challenge_session": challenge["session"],
                        "enrollment_session": enrollment_session,
                    },
                    clock() + ENROLLMENT_AGE,
                    clock(),
                )
                set_cookie(response, recovery_sid, ENROLLMENT_AGE)
                return {
                    "state": "mfa_recovery_enrollment",
                    "secret_code": secret_code,
                    "otpauth_uri": "otpauth://totp/Travella?secret="
                    + secret_code
                    + "&issuer=Travella",
                }
            except (ClientError, BotoCoreError, TokenValidationError, KeyError, ValueError):
                pass
        raise HTTPException(401, SIGN_IN_ERROR)

    @app.post("/auth/mfa/recovery/verify")
    def verify_mfa_recovery(data: MfaInput, request: Request, response: Response):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            recovery = store.get(sid, clock())
            store.delete(sid)
            try:
                if not recovery or recovery.get("kind") != "recovery_enrollment":
                    raise TokenValidationError("Recovery setup expired")
                result = provider.verify_software_token(
                    data.code, session=recovery["enrollment_session"]
                )
                if result.get("Status") != "SUCCESS":
                    raise TokenValidationError("Replacement code rejected")
                result = provider.answer_challenge(
                    recovery["challenge_session"],
                    "SOFTWARE_TOKEN_MFA",
                    {
                        "USERNAME": recovery["username"],
                        "SOFTWARE_TOKEN_MFA_CODE": data.code,
                    },
                )
                return finish(result, response, recovery["email"])
            except (ClientError, BotoCoreError, TokenValidationError, KeyError):
                pass
        raise HTTPException(401, SIGN_IN_ERROR)

    @app.post("/auth/refresh")
    def refresh(request: Request, response: Response):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            session = store.get(sid, clock())
            if session and session["kind"] == "session":
                try:
                    tokens = provider.refresh(session["refresh"])["AuthenticationResult"]
                    principal = identity(tokens["AccessToken"])
                    if principal.subject != session["subject"]:
                        raise TokenValidationError("Subject changed")
                    session.update(
                        access=tokens["AccessToken"],
                        access_expires=principal.expires_at,
                        refresh=tokens.get("RefreshToken", session["refresh"]),
                    )
                    store.update(sid, session)
                    # Do not renew cookie or DB expiry: original full sign-in is the ceiling.
                    return {"state": "signed_in"}
                except (ClientError, BotoCoreError, TokenValidationError, KeyError):
                    pass
            store.delete(sid)
        raise HTTPException(401, "Sign-in required.")

    @app.get("/auth/session")
    def session_info(request: Request):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            session = store.get(sid, clock())
            if session and session["kind"] == "session":
                if session["access_expires"] <= clock():
                    return JSONResponse({"state": "refresh_required"}, status_code=401)
                try:
                    principal = identity(session["access"])
                    if principal.subject == session["subject"]:
                        return {"state": "signed_in", "access_expires_at": principal.expires_at}
                except (ClientError, BotoCoreError, TokenValidationError):
                    pass
            store.delete(sid)
        raise HTTPException(401, "Sign-in required.")

    @app.post("/auth/sign-out")
    def sign_out(request: Request, response: Response):
        ready()
        with store.transaction():
            sid = request.cookies.get(cookie)
            session = store.get(sid, clock())
            store.delete(sid)
            if session and session["kind"] == "session":
                try:
                    provider.revoke(session["refresh"])
                except (ClientError, BotoCoreError):
                    # Local authorization ends even if Cognito is unavailable.
                    pass
        clear(response)
        return {"state": "sign_in"}

    from .account import register_account_routes
    register_account_routes(app, provider, verifier, store, current_session, ready, clock, capability_reader)
    return app
