/**
 * Must contain a token with the form 'Bearer TOKEN'
 * The default authorizetoken header in the authorizer is defined and mapped at lib/authorizer_service.js
 * @param {*} event 
 * @returns 
 */
exports.getDIDTokenFromAuthToken = (token) => {
    const parsedToken = token?.substring(7);
    if (parsedToken && parsedToken.length > 0) {
        console.log(`[getDIDTokenFromAuthToken] parsed result ${parsedToken} from token ${token}`)
        return parsedToken
    } else {
        console.log(`[getDIDTokenFromAuthToken] could not be extracted from token ${token} as it is empty`)
        return
    }
}