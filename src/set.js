const LAST_DECAY_KEY = '_last_decay';
const LIFETIME_KEY = '_t';
const HI_PASS_FILTER = 0.0001;

/**
 *
 * @param arr
 * @param filters
 * @returns {Array}
 */
function filter(arr, filters) {
  const tmp = [];

  for (let i = 0, iLen = arr.length; i < iLen; i++) {
    if (filters[arr[i]]) {
      i += 1;
    } else {
      tmp.push({ item: Buffer.isBuffer(arr[i]) ? arr[i].toString() : arr[i], score: arr[++i] });
    }
  }

  return tmp;
}

export default class Set {
  constructor(key, lifetime, hook) {
    this.key = key;
    this.hook = hook;
    this.lifetime = lifetime;
  }

  /**
   *
   * @returns {*[]}
   */
  static specialKeys() {
    return [LIFETIME_KEY, LAST_DECAY_KEY];
  }

  /**
   *
   * @returns {{_t: 1, _last_decay: 1}}
   */
  static specialKeysObj() {
    return {
      _t: 1,
      _last_decay: 1,
    };
  }

  /**
   * Creates a new set with new decay and lifetime keys
   * @param options
   * @param hook
   * @returns {*}
   */
  static create(options, hook) {
    const o = options;
    if (!o) return Promise.reject(new Error('Invalid options!'));
    if (!o.time) return Promise.reject(new Error('Invalid mean lifetime specified!'));
    if (!o.key) return Promise.reject(new Error('Invalid set key specified!'));

    const date = o.date || new Date().getTime();
    const set = new Set(o.key, o.time, hook);

    return set.updateDecayDate(date).then(() => set.createLifetimeKey(o.time)).then(() => set);
  }

  /**
   * Get an existing set
   * @param name
   * @param lifetime
   * @param hook
   * @returns {Set}
   */
  static get(name, lifetime, hook) {
    return new Set(name, lifetime, hook);
  }

  /**
   * Internal fet set and filter out lifetime and decay keys
   * @param options
   * @returns {Promise.<Array>}
   * @private
   */
  _fetch(options = {}) {
    const limit = options.limit || 1;
    const bufferedLimit = limit > 0 ? limit + (Set.specialKeys().length - 1) : limit;

    return this
      .hook.client.zrevrange(this.key, 0, bufferedLimit, 'withScores')
      .then(set => filter(set, Set.specialKeysObj()));
  }

  /**
   *
   * @param options
   */
  fetch(options = {}) {
    const promises = [];

    if (options.scrub) promises.push(this.scrub(options));
    if (options.decay) promises.push(this.decay(options));

    if (options.bin) {
      promises.push(this.hook.client.zscore(this.key, options.bin));
    } else {
      promises.push(this._fetch(options));
    }

    if (!promises.length) return Promise.resolve();
    if (promises.length === 1) return promises[0];
    return Promise.all(promises).then(results => results[promises.length - 1]);
  }

  /**
   *
   * @returns {*}
   */
  scrub() {
    return this.hook.client.zremrangebyscore(this.key, '-inf', HI_PASS_FILTER);
  }

  /**
   * Returns set lifetime
   * @returns {*}
   */
  getLifeTime() {
    return this.hook.client.zscore(this.key, LIFETIME_KEY).then(date => {
      if (!date) {
        return this.createLifetimeKey(this.lifetime);
      }
      return parseFloat(date);
    });
  }

  /**
   * Returns the date of the last decay
   * @returns {Promise.<Number>}
   */
  getLastDecayDate() {
    return this.hook.client.zscore(this.key, LAST_DECAY_KEY).then(date => {
      if (!date) {
        return this.updateDecayDate(new Date().getTime());
      }
      return parseFloat(date);
    });
  }

  /**
   * Set the new last decay date
   * @param date
   * @returns {*}
   */
  updateDecayDate(date) {
    return this.hook.client.zadd(this.key, date, LAST_DECAY_KEY).then(() => date);
  }

  /**
   *
   * @param options
   * @returns Promise
   */
  incr(options = {}) {
    const date = options.date || new Date().getTime();
    return this.isValidIncrDate(date)
               .then(() => this.hook.client.zincrby(this.key, options.by, options.bin));
  }

  /**
   * Ensures the increment date is greater than the last decay date
   * @param date
   * @returns Promise
   */
  isValidIncrDate(date) {
    return this
      .getLastDecayDate()
      .then(lastDecayDate => {
        if (date < lastDecayDate) return Promise.reject('Invalid increment date specified.');
        return Promise.resolve();
      });
  }

  /**
   *
   * @param date
   * @returns {*}
   */
  createLifetimeKey(date) {
    return this.hook.client.zadd(this.key, date, LIFETIME_KEY).then(() => date);
  }

  /**
   *
   * @param delta
   * @param set
   * @private
   */
  _decay(delta, set) {
    return this
      .getLifeTime()
      .then(lifetime => {
        const rate = 1 / lifetime;
        const multi = this.hook.client.multi();

        for (let i = 0, iLen = set.length; i < iLen; i++) {
          multi.zadd(this.key, (set[i].score * rate * (lifetime / 2)) * Math.exp(-delta * rate), set[i].item);
        }

        return multi.exec().then(() => this.updateDecayDate(new Date().getTime()));
      });
  }

  /**
   *
   * @param options
   * @returns Promise
   */
  decay(options) {
    return this
      .getLastDecayDate()
      .then(lastDecayDate => {
        const nextDecayDate = options.date || new Date().getTime();
        const delta = nextDecayDate - lastDecayDate;
        return this
          ._fetch(options)
          .then(set => this._decay(delta, set));
      });
  }

}
