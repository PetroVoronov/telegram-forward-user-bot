/* eslint-disable sonarjs/public-static-readonly */
/** @module cache/cached-items **/

const stringify = require('json-stringify-safe');
const {securedLogger: log} = require('../logging/logging');

/** Class representing cached items
 * @class
 * @classdesc Class to cache named values
 * @property {Map} items - Map to store items
 * @property {function} #getItem - Get item from storage
 * @property {function} #setItem - Set item to storage
 * @property {function} #removeItem - Remove item from storage
 **/
class Cache {
  static eventGet = 'set';
  static eventSet = 'get';
  static eventRemove = 'remove';
  static events = [Cache.eventGet, Cache.eventSet, Cache.eventRemove];

  items = new Map();
  reactions = new Map();
  #getItem = null;
  #setItem = null;
  #removeItem = null;

  /**
   * typedef {Object} CacheMethods
   * @property {function} getItem - Get item from storage
   * @property {function} setItem - Set item to storage
   * @property {function} removeItem - Remove item from storage
   **/

  /**
   * @param {CacheMethods} param0 - Methods to get, set and remove items from storage {@link CacheMethods}
   **/
  constructor({getItem, setItem, removeItem}) {
    this.#getItem = getItem || null;
    this.#setItem = setItem || null;
    this.#removeItem = removeItem || null;
  }

  /**
   * Get item from cache
   * @param {string} key - Key to get item
   * @param {string=} type - Type of the item
   * @returns {any} - Item value
   **/
  getItem(key, type) {
    log.debug(`Cache] [Get item: key: ${key}`);
    const skipKey = `-${key}`;
    let result = null;
    if (this.items.has(key) === false) {
      if (this.#getItem !== null) {
        result = this.#getItem(key);
        if (result !== null && result !== undefined) {
          try {
            result = JSON.parse(result);
            // eslint-disable-next-line sonarjs/no-ignored-exceptions
          } catch (e) {
            log.debug(`Cache] [Error parsing item from storage: key: ${key}, value: `, {[skipKey]: result});
          }
        }
        log.debug(`Cache] [Get item from storage: key: ${key}, value: `, {[skipKey]: stringify(result)});
        if (result !== null && result !== undefined) {
          this.items.set(key, result);
        }
      }
    } else {
      result = this.items.get(key);
    }
    if (type !== undefined && type !== null) {
      const originalValue = result;
      if (typeof result !== type) {
        switch (type) {
          case 'number': {
            if (isNaN(result)) {
              result = null;
            } else {
              result = Number(result);
            }
            break;
          }
          case 'string': {
            result = String(result);
            break;
          }
          case 'boolean': {
            result = Boolean(result);
            break;
          }
          case 'array': {
            if (Array.isArray(result) === false) {
              result = null;
            }
            break;
          }

          default:
            result = null;
        }
        if (result !== originalValue) {
          this.setItem(key, result);
        }
      }
    }
    log.debug(
      `Cache] [Get item result: key: ${key}, value: `,
      {[skipKey]: stringify(result)},
      `, type: ${typeof result}, isArray: ${Array.isArray(result)}`,
    );
    this.eventReaction(key, Cache.eventGet, result);
    return result;
  }

  /**
   * Store item to cache
   * @param {string} key - Key to set item
   * @param {any} value - Item value
   **/
  setItem(key, value) {
    const skipKey = `-${key}`;
    log.debug(`Cache] [Set item: key: ${key}, value: `, {[skipKey]: stringify(value)});
    this.items.set(key, value);
    if (this.#setItem !== null) {
      log.debug(`Cache] [Set item to storage: key: ${key}, value: `, {[skipKey]: stringify(value)});
      if (value !== null && value !== undefined) {
        this.#setItem(key, JSON.stringify(value, null, 1));
      } else {
        this.#removeItem(key);
      }
    }
    this.eventReaction(key, Cache.eventSet, value);
  }

  /**
   * Remove item from cache
   * @param {string} key - Key to remove item
   **/
  removeItem(key) {
    this.items.delete(key);
    if (this.#removeItem !== null) {
      this.#removeItem(key);
    }
    this.eventReaction(key, Cache.eventRemove, null);
  }

  eventReaction(key, event, value) {
    if (this.reactions.has(key) === true) {
      const reactions = this.reactions.get(key);
      if (reactions[event] !== undefined) {
        log.debug(`Cache] [Reaction to event: key: ${key}, event: ${event}`);
        reactions[event](key, value);
      }
    }
  }

  /**
   * Register reaction to cache
   * @param {string} key - Key to register reaction
   * @param {string} event - Event on {@link Cache.eventGet}, {@link Cache.eventSet}, {@link Cache.eventRemove}
   * @param {function} callback - Callback function
   **/
  registerEventForItem(key, event, callback) {
    if (Cache.events.includes(event) === true) {
      if (this.reactions.has(key) === false) {
        this.reactions.set(key, {});
      }
      this.reactions.get(key)[event] = callback;
    }
  }
}

module.exports = {
  Cache,
};
