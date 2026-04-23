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

  // 1. Verifica se é um array de erros de validação (Padrão Spring MethodArgumentNotValidException)
  if (Array.isArray(errorBody) && errorBody.length > 0) {
    const firstError = errorBody[0];
    return (
      firstError.defaultMessage ||
      firstError.errorMessage ||
      firstError.message ||
      fallbackMessage
    ).replace(/^Error:\s*/i, ''); // Remove prefixo "Error:" se existir
  }

  // 2. Verifica se é um objeto único com propriedades conhecidas
  const message =
    errorBody.errorMessage ||
    errorBody.message ||
    (typeof errorBody === 'string' ? errorBody : null);

  return message ? message.replace(/^Error:\s*/i, '') : fallbackMessage;
}

/**
 * Verifica se um erro contém detalhes específicos do backend.
 */
export function getErrorDetails(err: any): Record<string, string> | null {
  return err?.error?.errorsDetails || null;
}
