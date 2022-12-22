const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class NFTService extends Construct {
  constructor(scope, id, api, bucket) {
    super(scope, id);

    const handler = new lambda.Function(this, "NFTHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "nft/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const nftIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      cacheKeyParameters: [
        'method.request.path.address', 
        'method.request.path.token_id',
        'method.request.querystring.owner_of',
        'method.request.querystring.chain'
      ],
      requestParameters: {
        'integration.request.path.address': 'method.request.path.address',
        'integration.request.path.token_id': 'method.request.path.token_id',
        'integration.request.querystring.owner_of': 'method.request.querystring.owner_of',
        'integration.request.querystring.chain': 'method.request.querystring.chain'
      },
    });

    const rootNft = api.root.addResource('nft');
    const nftAddress = rootNft.addResource('{address}');
    const nftToken = nftAddress.addResource('{token_id}');
    nftToken.addMethod('GET', nftIntegration, {
      requestParameters: {
        'method.request.path.address': true,
        'method.request.path.token_id': true,
        'method.request.querystring.owner_of': false,
        'method.request.querystring.chain': false,
      },
      apiKeyRequired: true
    });
  }
}

module.exports = { NFTService }