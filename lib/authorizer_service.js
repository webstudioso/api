const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");

class AuthorizerService extends Construct {
  constructor(scope, id) {
    super(scope, id);

    const key = "APIKey";
    const apiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      key,
      key
    );

    const authorizerFn = new lambda.Function(this, "BasicAuthAuthorizer", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "authorizer/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        API_KEY: apiKeySecret.secretValueFromJson(key).unsafeUnwrap()
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