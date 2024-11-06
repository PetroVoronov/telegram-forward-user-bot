const { Logger } = require('telegram/extensions/Logger');
const { securedLogger } = require('../../../src/modules/logging/logging');

describe('SecuredLogger', () => {
    let logger;

    beforeEach(() => {
        logger = new securedLogger.constructor('info');
    });

    test('should mask sensitive information in log messages', () => {
        const message = { token: '1234567890abcdef', user: 'testuser' };
        const maskedMessage = logger.processMessageObject(message);
        expect(maskedMessage).toContain('token: "123**********def"');
        expect(maskedMessage).toContain('user: "tes*****"');
    });

    test('should not mask non-sensitive information in log messages', () => {
        const message = { info: 'This is a test message' };
        const maskedMessage = logger.processMessageObject(message);
        expect(maskedMessage).toContain('info: "This is a test message"');
    });

    test('should mask string values correctly', () => {
        expect(logger.maskString('1234567890abcdef')).toBe('123**********def');
        expect(logger.maskString('shorter')).toBe('sho****');
        expect(logger.maskString('tiny')).toBe('****');
    });

    test('should set and get maskCharactersVisible correctly', () => {
        logger.setMaskCharactersVisible(4);
        expect(logger.maskCharactersVisible).toBe(4);
    });

    test('should set and get maskWords correctly', () => {
        const newMaskWords = ['api', 'token'];
        logger.setMaskWords(newMaskWords);
        expect(logger.maskWords).toEqual(newMaskWords);
    });

    test('should append mask words correctly', () => {
        logger.appendMaskWord('additional');
        expect(logger.maskWords).toContain('additional');
    });

    test('should remove mask words correctly', () => {
        logger.removeMaskWord('token');
        expect(logger.maskWords).not.toContain('token');
    });

    test('should log messages at appropriate levels', () => {
        const spy = jest.spyOn(Logger.prototype, '_log');
        logger.info('This is an info message');
        expect(spy).toHaveBeenCalledWith('info', 'This is an info message', expect.anything());
        spy.mockRestore();
    });
});