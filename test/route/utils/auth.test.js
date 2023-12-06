const { getDIDTokenFromEvent } = require('../../../resources/utils/auth');


describe('Auth Utils', () => {

    it('Returns empty if invalid header', () => {
        const DIDToken = getDIDTokenFromEvent();
        expect(DIDToken).toBe();
    });

    it('Parses string by removing BEARER suffix from event.authorizationToken', () => {
        const event = {
            authorizationToken: 'Bearer abc='
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe('abc=');
    });

    it('Returns empty if wrong length from event.authorizationToken', () => {
        const event = {
            authorizationToken: '123'
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe();
    });

    it('Parses string by removing BEARER suffix from event.headers.auhtorizetoken', () => {
        const event = {
            headers: {
                authorizetoken: 'Bearer abc='
            }
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe('abc=');
    });

    it('Returns empty if wrong length from event.headers.auhtorizetoken', () => {
        const event = {
            headers: {
                authorizetoken: '123'
            }
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe();
    });

    it('Parses string by removing BEARER suffix from event.headers.AuthorizeToken', () => {
        const event = {
            headers: {
                AuthorizeToken: 'Bearer abc='
            }
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe('abc=');
    });

    it('Returns empty if wrong length from event.headers.AuhtorizeToken', () => {
        const event = {
            headers: {
                AuthorizeToken: '123'
            }
        }
        const DIDToken = getDIDTokenFromEvent(event);
        expect(DIDToken).toBe();
    });
});
    