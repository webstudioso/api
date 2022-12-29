exports.main = async (event, context) => {
    let policy = {
      "principalId": "user",
      "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Action": "execute-api:Invoke",
            "Effect": event?.authorizationToken === process.env.API_KEY ? "Allow" : "Deny",
            "Resource": "*"
          }
        ]
      }
    }
    return policy
}