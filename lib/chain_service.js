const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class ChainService extends Construct {
  constructor(scope, id, api, bucket) {
    super(scope, id);

    const handler = new lambda.Function(this, "ChainHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "chain/getAll.main",
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

    const rootById = root.addResource('{chain_id}');

    const handlerById = new lambda.Function(this, "ChainByIdHandler", {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("resources"),
        handler: "chain/getById.main",
        timeout: cdk.Duration.seconds(20),
        environment: {
          BUCKET: bucket.bucketName
        }
      });
  
      bucket.grantReadWrite(handlerById);


    const integrationById = new apigateway.LambdaIntegration(handlerById, {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' },
        cacheKeyParameters: [
          'integration.request.path.chain_id'
        ],
        requestParameters: {
          'integration.request.path.chain_id': 'method.request.path.chain_id'
        },
      });
      rootById.addMethod('GET', integrationById, {
        requestParameters: {
            'method.request.path.chain_id': true,
        },
        apiKeyRequired: true
      });
  }
}

module.exports = { ChainService }