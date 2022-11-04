const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");

class WalletService extends Construct {
  constructor(scope, id, api) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "WalletStore");

    const handler = new lambda.Function(this, "WalletHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "wallet/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      cacheKeyParameters: [
        'method.request.path.address',
        'method.request.querystring.chain'
      ],
      requestParameters: {
        'integration.request.path.address': 'method.request.path.address',
        'integration.request.querystring.chain': 'method.request.querystring.chain'
      },
    });

    const rootWallet = api.root.addResource('wallet');
    const walletAddress = rootWallet.addResource('{address}');
    const balance = walletAddress.addResource('balance');
    balance.addMethod('GET', integration, {
      requestParameters: {
        'method.request.path.address': true,
        'method.request.querystring.chain': false
      },
      apiKeyRequired: true
    });
  }
}

module.exports = { WalletService }