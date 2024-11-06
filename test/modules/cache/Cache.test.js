const { Cache } = require('../../../src/modules/cache/Cache');

describe('Cache', () => {
    let cache;
    let mockGetItem;
    let mockSetItem;
    let mockRemoveItem;

    beforeEach(() => {
        mockGetItem = jest.fn();
        mockSetItem = jest.fn();
        mockRemoveItem = jest.fn();
        cache = new Cache({
            getItem: mockGetItem,
            setItem: mockSetItem,
            removeItem: mockRemoveItem,
        });
    });

    test('should set and get item from cache', () => {
        const key = 'testKey';
        const value = 'testValue';

        cache.setItem(key, value);
        expect(cache.getItem(key)).toBe(value);
    });

    test('should call getItem method when item is not in cache', () => {
        const key = 'testKey';
        const value = 'testValue';
        mockGetItem.mockReturnValue(JSON.stringify(value));

        expect(cache.getItem(key)).toBe(value);
        expect(mockGetItem).toHaveBeenCalledWith(key);
    });

    test('should call setItem method when setting item to cache', () => {
        const key = 'testKey';
        const value = 'testValue';

        cache.setItem(key, value);
        expect(mockSetItem).toHaveBeenCalledWith(key, JSON.stringify(value, null, 1));
    });

    test('should call removeItem method when removing item from cache', () => {
        const key = 'testKey';

        cache.setItem(key, 'testValue');
        cache.removeItem(key);
        expect(mockRemoveItem).toHaveBeenCalledWith(key);
    });

    test('should convert type of item when getting from cache', () => {
        const key = 'testKey';
        const value = '123';

        cache.setItem(key, value);
        expect(cache.getItem(key, 'number')).toBe(123);
    });

    test('should trigger event reactions', () => {
        const key = 'testKey';
        const value = 'testValue';
        const mockCallback = jest.fn();

        cache.registerEventForItem(key, Cache.eventSet, mockCallback);
        cache.setItem(key, value);
        expect(mockCallback).toHaveBeenCalledWith(key, value);
    });

    test('should handle JSON in getItem method', () => {
        const key = 'testKey';
        mockGetItem.mockReturnValue('{"test": "value"}');

        expect(cache.getItem(key)).toEqual({ test: 'value' });
    });
});