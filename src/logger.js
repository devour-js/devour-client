const Minilog = require('minilog')

class Logger {
  static debug (message) {
    this.instantiate().debug(message)
  }

  static disable () {
    Minilog.disable()
  }

  static enable () {
    Minilog.enable()
  }

  static error (message) {
    this.instantiate().error(message)
  }

  static info (message) {
    this.instantiate().info(message)
  }

  static instantiate () {
    if (!this.minilog) {
      this.minilog = Minilog('devour')
    }

    return this.minilog
  }

  static warn (message) {
    this.instantiate().warn(message)
  }
}

module.exports = Logger
