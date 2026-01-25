"""
AES-256-GCM encryption/decryption matching the Next.js implementation.

Format: base64(IV + AuthTag + Ciphertext)
Key derivation: scrypt with fixed salt "plaid-token-salt"
"""

import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

from app.config import settings

IV_LENGTH = 16
AUTH_TAG_LENGTH = 16
SALT_LENGTH = 32
KEY_LENGTH = 32


def _scrypt_derive(password: bytes, salt: bytes, length: int) -> bytes:
    """Derive key using scrypt (matching Node.js scryptSync parameters)."""
    # Node.js scryptSync defaults: N=16384 (2^14), r=8, p=1
    return hashlib.scrypt(
        password,
        salt=salt,
        n=16384,
        r=8,
        p=1,
        dklen=length,
    )


def _get_encryption_key() -> bytes:
    """
    Derive encryption key from secret (matches Next.js implementation).

    // From Next.js:
    // const salt = scryptSync(secret, "plaid-token-salt", SALT_LENGTH);
    // return scryptSync(secret, salt, KEY_LENGTH);
    """
    secret = settings.ENCRYPTION_SECRET
    if not secret:
        raise ValueError("ENCRYPTION_SECRET not configured")

    secret_bytes = secret.encode("utf-8")

    # First derivation: create salt from secret
    salt = _scrypt_derive(secret_bytes, b"plaid-token-salt", SALT_LENGTH)

    # Second derivation: create key from secret using derived salt
    key = _scrypt_derive(secret_bytes, salt, KEY_LENGTH)

    return key


def decrypt(encrypted_data: str) -> str:
    """
    Decrypt AES-256-GCM encrypted data.

    Format: base64(IV + AuthTag + Ciphertext)
    """
    key = _get_encryption_key()
    combined = base64.b64decode(encrypted_data)

    iv = combined[:IV_LENGTH]
    auth_tag = combined[IV_LENGTH : IV_LENGTH + AUTH_TAG_LENGTH]
    ciphertext = combined[IV_LENGTH + AUTH_TAG_LENGTH :]

    # AESGCM expects ciphertext with tag appended
    ciphertext_with_tag = ciphertext + auth_tag

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext_with_tag, None)

    return plaintext.decode("utf-8")


def encrypt(plaintext: str) -> str:
    """
    Encrypt using AES-256-GCM.

    Returns: base64(IV + AuthTag + Ciphertext)
    """
    key = _get_encryption_key()
    iv = os.urandom(IV_LENGTH)

    aesgcm = AESGCM(key)
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)

    # Split ciphertext and tag
    ciphertext = ciphertext_with_tag[:-AUTH_TAG_LENGTH]
    auth_tag = ciphertext_with_tag[-AUTH_TAG_LENGTH:]

    # Combine: IV + AuthTag + Ciphertext (matches Next.js format)
    combined = iv + auth_tag + ciphertext
    return base64.b64encode(combined).decode("utf-8")


def is_encrypted(value: str) -> bool:
    """Check if a string appears to be encrypted."""
    try:
        decoded = base64.b64decode(value)
        # Minimum length: IV (16) + AuthTag (16) + at least 1 byte of ciphertext
        return len(decoded) >= IV_LENGTH + AUTH_TAG_LENGTH + 1
    except Exception:
        return False
