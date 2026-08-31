export const logger = {
  error: (context: string, messageOrError?: unknown, details?: unknown) => {
    const message =
      messageOrError instanceof Error
        ? messageOrError.message
        : typeof messageOrError === 'string'
          ? messageOrError
          : details instanceof Error
            ? details.message
            : typeof details === 'string'
              ? details
              : 'Unknown error'

    const payload = details && !(details instanceof Error) && typeof details !== 'string'
      ? { error: details }
      : {}

    console.error(JSON.stringify({
      level: 'error',
      context,
      message,
      ...payload,
      timestamp: new Date().toISOString(),
    }))
  },
}
