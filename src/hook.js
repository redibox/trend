import Delta from './delta';
import defaults from './defaults';
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
    if (!this.options.defaultTrends.length) return Promise.resolve();
    const promises = [];

    for (let i = 0, iLen = this.options.defaultTrends.length; i < iLen; i++) {
      promises.push(this.getOrCreate(this.options.defaultTrends[i], true));
    }

    return Promise.all(promises);
  }

  /**
   * Get an existing delta
   * @param name
   * @returns {Delta}
   * @deprecated
   */
    // get(name) {
    //   const _name = this.toKey(`${name}`);
    //   return this.exists(name).then(exists => {
    //     if (!exists) return Promise.reject(new Error(`Delta '${name}' does not exist!`));
    //     return new Delta(_name, this);
    //   });
    // }

  /**
   * Get an existing delta or create it
   * @param options
   * @param attach
   * @returns {*}
   */
  getOrCreate(options, attach) {
    const o = options;
    if (!o || !isObject(o)) return Promise.reject(new Error('Valid options object is required to create a new delta.'));
    if (!o.name) return Promise.reject(new Error('Missing required option \'name\'.'));
    if (!o.time) return Promise.reject(new Error('Missing required option \'time\' - mean lifetime of this delta.'));

    return this.exists(o.name).then(exists => {
      if (!exists) {
        return new Delta(o.name, o, this)
          .init(o)
          .then(delta => {
            if (attach) this[o.name] = delta;
            return Promise.resolve(delta);
          });
      }
      // create default date if none specified
      o.date = o.date || new Date().getTime();
      const _delta = new Delta(this.toKey(`${o.name}`), o, this);
      if (attach) this[o.name] = _delta;
      return Promise.resolve(_delta);
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

    return new Delta(o.name, o, this).init(o);
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

  // noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
  /**
   * Default config for scheduler
   * @returns {{someDefaultThing: string}}
   */
  defaults() {
    return defaults;
  }
}
