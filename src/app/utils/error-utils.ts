/**
 * Extrai a mensagem de erro de uma resposta HTTP do backend.
 * Verifica as propriedades 'errorMessage' (padrão ErrorRecordResponse)
 * e 'message' (padrão Spring/fallback).
 */
export function extractErrorMessage(
  err: any,
  fallbackMessage: string = 'Ocorreu um erro inesperado'
): string {
  if (!err) return fallbackMessage;

  // Se for uma resposta de erro do backend (HttpErrorResponse.error)
  const errorBody = err.error || err;

  return (
    errorBody.errorMessage ||
    errorBody.message ||
    (typeof errorBody === 'string' ? errorBody : null) ||
    fallbackMessage
  );
}

/**
 * Verifica se um erro contém detalhes específicos do backend.
 */
export function getErrorDetails(err: any): Record<string, string> | null {
  return err?.error?.errorsDetails || null;
}
