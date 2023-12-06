/**
 * Must contain a token with the form 'Bearer TOKEN'
 * The default authorizetoken header in the authorizer is defined and mapped at lib/authorizer_service.js
 * It can be found in either:
 * 1. event.authorzationToken in authorizer handler
 * 2. event.headers.authorizetoken or event.headers.AuthorizeToken on project and route handlers
 * The case sensitiveness seems to depend on browser (this needs to be confirmed TBD)
 * @param {*} event 
 * @returns 
 */
exports.getDIDTokenFromEvent = (event) => {
    const headers = event?.headers;
    const token =   event?.authorizationToken || 
                    headers?.authorizetoken || 
                    headers?.AuthorizeToken;
    const parsedToken = token?.substring(7);
    if (parsedToken && parsedToken.length > 0) {
        console.log(`[getDIDTokenFromAuthToken] parsed result ${parsedToken} from token ${token}`)
        return parsedToken
    } else {
        console.log(`[getDIDTokenFromAuthToken] could not be extracted from token ${token} as it is empty`)
        return
    }
}