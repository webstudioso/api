const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class AuthorizerService extends Construct {
  constructor(scope, id, secret, key) {
    super(scope, id);

    const authorizerFn = new lambda.Function(this, "BasicAuthAuthorizer", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "authorizer/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        MAGIC: secret.secretValueFromJson(key).unsafeUnwrap()
      }
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'CustomBasicAuthAuthorizer', {
      handler: authorizerFn,
      identitySource: 'method.request.header.AuthorizeToken',
    });

    return authorizer
  }
}

module.exports = { AuthorizerService }