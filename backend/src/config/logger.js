// Logger simple — à remplacer par winston ou pino si besoin
const logger = {
  info:  (...args) => console.log('[INFO]',  ...args),
  warn:  (...args) => console.warn('[WARN]',  ...args),
  error: (...args) => console.error('[ERROR]', ...args),
}

export default logger
