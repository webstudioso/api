const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");

class ChainService extends Construct {
  constructor(scope, id, api) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "ChainStore");

    const handler = new lambda.Function(this, "ChainHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "chain/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      cacheKeyParameters: [
        'method.request.querystring.type',
        'method.request.querystring.chain'
      ],
      requestParameters: {
        'integration.request.querystring.type': 'method.request.querystring.type',
        'integration.request.querystring.chain': 'method.request.querystring.chain'
      },
    });

    const root = api.root.addResource('chain');
    root.addMethod('GET', integration, {
      requestParameters: {
        'method.request.querystring.type': false,
        'method.request.querystring.chain': false,
      },
      apiKeyRequired: true
    });
  }
}

module.exports = { ChainService }