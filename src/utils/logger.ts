export const logger = {
  error: (context: string, error: unknown) => {
    console.error(JSON.stringify({
      level: 'error',
      context,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }))
  },
}
