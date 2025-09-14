// Sistema de logging para el proyecto

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []
  
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error
    }
    
    this.logs.push(entry)
    
    // Keep only last 100 logs in memory
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
    
    // Only log to console in development
    if (this.isDevelopment) {
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
      const timestamp = entry.timestamp.toISOString()
      
      switch (level) {
        case 'debug':
          console.debug(`[${timestamp}] DEBUG: ${message}${contextStr}`)
          break
        case 'info':
          console.info(`[${timestamp}] INFO: ${message}${contextStr}`)
          break
        case 'warn':
          console.warn(`[${timestamp}] WARN: ${message}${contextStr}`)
          if (error) console.warn(error)
          break
        case 'error':
          console.error(`[${timestamp}] ERROR: ${message}${contextStr}`)
          if (error) console.error(error)
          break
      }
    }
    
    // In production, you could send critical errors to a logging service
    if (!this.isDevelopment && level === 'error') {
      // Example: Send to external logging service
      // this.sendToLoggingService(entry)
    }
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }
  
  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error)
  }
  
  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error)
  }
  
  // Get recent logs for debugging
  getRecentLogs(count = 10): LogEntry[] {
    return this.logs.slice(-count)
  }
  
  // Clear logs
  clearLogs() {
    this.logs = []
  }
}

// Export singleton instance
export const logger = new Logger()

// Convenience functions for common patterns
export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  logger.error(message, context, error)
}

export const logWarning = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context)
}

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context)
}

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context)
}