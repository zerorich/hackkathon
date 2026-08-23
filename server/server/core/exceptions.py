"""Re-exports for API layer compatibility."""

from server.core.errors import ERROR_CODES, AppError

ErrorCode = ERROR_CODES

__all__ = ["AppError", "ErrorCode", "ERROR_CODES"]
