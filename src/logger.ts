import * as Minilog from 'minilog';

export class Logger {
  private readonly logger: Minilog;

  constructor() {
    if (!this.logger) {
      this.logger = Minilog('devour-client-ts');
    }
  }

  static disable() {
    Minilog.disable();
  }

  static enable() {
    Minilog.enable();
  }

  static instantiate() {
    return new Logger();
  }

  static debug(message) {
    this.instantiate().debug(message);
  }

  static error(message) {
    this.instantiate().error(message);
  }

  static info(message) {
    this.instantiate().info(message);
  }

  static warn(message) {
    this.instantiate().warn(message);
  }

  private info(message) {
    this.logger.info(message);
  }

  private warn(message) {
    this.logger.warn(message);
  }

  private error(message) {
    this.logger.error(message);
  }

  private debug(message) {
    this.logger.debug(message);
  }
}
