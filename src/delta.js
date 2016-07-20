import Promise from 'bluebird';
import { isObject } from 'redibox';

import Set from './set';

const NORM_T_MULT = 2;

export default class Delta {

  constructor(name, options, hook) {
    this.hook = hook;
    this.name = name;
    this.options = options;
    this.lastScrubAndDecay = null;
    this.incrSinceLastScrubAndDecay = 0;
    this.primarySet = this.getSet(this.getPrimaryKey());
    this.secondarySet = this.getSet(this.getSecondaryKey(), true);
  }

  /**
   * Init this delta and create relevant keys.
   * @param options
   */
  init(options) {
    const o = options;
    const now = new Date().getTime();
    const secondaryDate = o.secondaryDate || (now - ((now - o.date) * NORM_T_MULT));

    const primaryPromise = Set.create({
      key: this.hook.toKey(this.getPrimaryKey()),
      time: o.time,
    }, this.hook);

    const secondaryPromise = Set.create({
      key: `${this.hook.toKey(this.name)}_2t`,
      time: o.secondaryTime || (o.time * NORM_T_MULT),
      date: secondaryDate,
    }, this.hook);

    o.secondaryTime = o.secondaryTime || (o.time * NORM_T_MULT);

    this.options = o;

    return Promise.join(primaryPromise, secondaryPromise, res => {
      this.primarySet = res[0];
      this.secondarySet = res[1];
      return this;
    });
  }

  /**
   * Pointless function award.
   * @returns {*}
   */
  getPrimaryKey() {
    return this.name;
  }

  /**
   *
   * @returns {string}
   */
  getSecondaryKey() {
    return `${this.name}_2t`;
  }

  /**
   *
   * @param options
   * @returns {*}
   */
  incr(options) {
    const o = options;
    if (!o || !isObject(o)) return Promise.reject(new Error('Invalid options provided'));
    if (!o.item) return Promise.reject(new Error('Invalid item specified'));
    o.bin = o.item;

    const promises = [
      this.primarySet.incr(o),
      this.secondarySet.incr(o),
    ];

    // auto decay every ~15min period or every 2500 increments
    if (!this.lastScrubAndDecay || (this.lastScrubAndDecay + 900000) < Date.now() || this.incrSinceLastScrubAndDecay > 2500) {
      promises.push(this.fetch({ limit: 1 }));
      this.lastScrubAndDecay = Date.now();
    }

    this.incrSinceLastScrubAndDecay++;

    return Promise.all(promises);
  }

  /**
   *
   * @param key
   * @param secondary
   * @returns {*}
   */
  getSet(key, secondary) {
    return Set.get(key, secondary ? this.options.secondaryTime : this.options.time, this.hook);
  }

  /**
   *
   * @param bin
   * @param scrub
   * @param decay
   * @param limit
   * @returns {{primary: *, secondary: string, bin: *, scrub: *, decay: *, limit: *}}
   */
  fetchOptions(bin, scrub, decay, limit) {
    return {
      primary: this.getPrimaryKey(),
      secondary: this.getSecondaryKey(),
      bin,
      scrub,
      decay,
      limit,
    };
  }

  /**
   * Internal fetch that fetches from both sets
   * @param o
   * @returns {*}
   * @private
   */
  _fetch(o) {
    if (!this.primarySet) return Promise.reject(new Error('Unable to initialize primary Set!'));
    if (!this.secondarySet) return Promise.reject(new Error('Unable to initialize secondary Set!'));

    /* eslint arrow-body-style:0 */
    return Promise.join(this.primarySet.fetch(o), this.secondarySet.fetch(o), (count, norm) => {
      return { count, norm };
    });
  }

  /**
   *
   * @param options
   * @returns Promise
   */
  fetch(options) {
    const o = options || {};
    o.decay = (typeof o.decay === 'undefined') ? true : !!o.decay;
    o.scrub = (typeof o.scrub === 'undefined') ? true : !!o.scrub;
    o.limit = o.limit || -1;

    if (o.item) o.bin = o.item;

    return this
      ._fetch(this.fetchOptions(o.bin, o.scrub, o.decay, o.limit))
      .then(sets => this.processResults(sets, o));
  }

  /**
   * Make pretty results array with scores
   * @param sets
   * @param options
   * @returns {Array}
   */
  processResults(sets, options) {
    const primary = sets.norm; // primary
    const secondary = sets.count; // secondary
    const results = [];

    if (!options.bin) {
      for (let i = 0, iLen = primary.length; i < iLen; i++) {
        const normV = parseFloat(primary[i].score);
        const countV = parseFloat(secondary[i].score);
        primary[i].score = Number.isNaN(normV) ? 0 : countV / normV;
        results.push({ item: primary[i].item, score: primary[i].score });
      }
      return results;
    }

    if (!primary) {
      results[options.bin] = null;
    } else {
      results.push({ item: options.bin, score: secondary / primary });
    }

    return results;
  }

}

