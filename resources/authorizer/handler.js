const { Magic } = require('@magic-sdk/admin');
const { getDIDTokenFromAuthToken } = require('../utils/auth');
const mAdmin = new Magic(process.env.MAGIC);

exports.main = async (event, context) => {

    let policyAccess = 'Deny';
    const DIDToken = getDIDTokenFromAuthToken(event?.authorizationToken);
    try {
      mAdmin.token.validate(DIDToken);
      policyAccess = 'Allow';
      console.log(`Valid token for request ${DIDToken}`);
    } catch (e) {
      console.log(`[ERROR MAGICLINK] ${e} for token ${DIDToken} from auhtorizationToken ${event?.authorizationToken}`);
    }

    let policy = {
      "principalId": "user",
      "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Action": "execute-api:Invoke",
            "Effect": policyAccess,
            "Resource": "*"
          }
        ]
      }
    }
    return policy
}