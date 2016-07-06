import Delta from './delta';
import { BaseHook, isObject } from 'redibox';

export default class Trends extends BaseHook {
  constructor() {
    super('trend');
  }

  /**
   *
   * @returns {Promise.<T>}
   */
  initialize() {
    return Promise.resolve();
  }

  /**
   * Get an existing delta
   * @param name
   * @returns {Delta}
   */
  get(name) {
    const _name = this.toKey(`${name}`);
    return this.exists(name).then(exists => {
      if (!exists) return Promise.reject(new Error(`Delta '${name}' does not exist!`));
      return new Delta(_name, this);
    });
  }

  /**
   * Returns true/false if delta exists.
   * @param name
   * @returns {Promise.<boolean>}
   */
  exists(name) {
    return this.client.exists(this.toKey(`${name}`)).then(result => result === 1);
  }

  /**
   * Create a new delta / trend.
   * @param options
   * @returns {Promise.<*>}
   */
  create(options) {
    const o = options;
    if (!o || !isObject(o)) return Promise.reject(new Error('Valid options object is required to create a new delta.'));
    if (!o.name) return Promise.reject(new Error('Missing required option \'name\'.'));
    if (!o.time) return Promise.reject(new Error('Missing required option \'time\' - mean lifetime of this delta.'));

    // all good, create default date if none specified
    o.date = o.date || new Date().getTime();

    return new Delta(o.name, this).init(o);
  }

  /**
   * Prefix keys
   * @param str
   * @returns {string}
   */
  toKey(str) {
    if (this.core.cluster.isCluster()) {
      return `hook:trend:{${str}}`;
    }
    return `hook:trend:${str}`;
  }
}
