const { getDIDTokenFromAuthToken } = require('../../../resources/utils/auth');


describe('Auth Utils', () => {

    it('Parses string by removing BEARER suffix', () => {
        const DIDToken = getDIDTokenFromAuthToken('Bearer abc=');
        expect(DIDToken).toBe('abc=');
    });

    it('Returns empty if invalid header', () => {
        const DIDToken = getDIDTokenFromAuthToken();
        expect(DIDToken).toBe();
    });

    it('Returns empty if wrong length', () => {
        const DIDToken = getDIDTokenFromAuthToken('123');
        expect(DIDToken).toBe();
    });
});
    