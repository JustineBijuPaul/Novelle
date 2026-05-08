import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class EncryptionManager:
    """
    PHI Encryption Engine.
    Provides field-level encryption for sensitive clinical data (PII/PHI).
    """

    def __init__(self):
        # In production, the key would be fetched from a Cloud KMS (Key Management Service)
        self.master_key = os.getenv("NOVELLE_MASTER_KEY", Fernet.generate_key().decode())
        self.cipher = Fernet(self.master_key.encode())

    def encrypt_phi(self, data: str) -> str:
        """Encrypt sensitive patient data before database persistence."""
        if not data:
            return ""
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt_phi(self, encrypted_data: str) -> str:
        """Decrypt clinical data for authorized medical viewing."""
        if not encrypted_data:
            return ""
        try:
            return self.cipher.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failure: {str(e)}")
            return "[DECRYPTION_ERROR]"

    def anonymize_id(self, user_id: int) -> str:
        """Generate a deterministic but non-reversible hash for AI training (De-identification)."""
        digest = hashes.Hash(hashes.SHA256())
        digest.update(str(user_id).encode())
        digest.update(self.master_key.encode()) # Salted with master key
        return base64.urlsafe_b64encode(digest.finalize()).decode()[:16]

# Global Encryption Instance
encryption_manager = EncryptionManager()
