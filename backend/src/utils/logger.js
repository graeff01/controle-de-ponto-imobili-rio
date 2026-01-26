const logger = {
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output com cores
    const colors = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      success: '\x1b[32m', // Green
      reset: '\x1b[0m'
    };

    const levelColor = colors[level] || colors.reset;
    const logOutput = `[${timestamp}] ${levelColor}${level.toUpperCase()}${colors.reset}: ${message}`;

    if (level === 'error') {
      console.error(logOutput, data);
    } else {
      console.log(logOutput, data);
    }
  },

  info(message, data) {
    this.log('info', message, data);
  },

  warn(message, data) {
    this.log('warn', message, data);
  },

  error(message, data) {
    this.log('error', message, data);
  },

  success(message, data) {
    this.log('success', message, data);
  }
};

module.exports = logger;
