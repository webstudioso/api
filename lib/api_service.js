const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");

class APIService extends Construct {
  constructor(scope, id) {
    super(scope, id);

    const rootDomain = process.env.ROOT_DOMAIN;
    const zone = route53.HostedZone.fromLookup(this, "baseZone", {
      domainName: rootDomain,
    });
  
    const api = new apigateway.RestApi(this, "nft-api", {
        restApiName: "NFT Service",
        description: "This service serves nft.",
        domainName: {
          domainName: `api.${rootDomain}`,
          endpointType: apigateway.EndpointType.EDGE,
          certificate: acm.Certificate.fromCertificateArn(
            this,
            "api-cert",
            process.env.ACM_ARN
          )
        },
        deployOptions: {
          cachingEnabled: true,
          cacheClusterEnabled: true,
          cacheTtl: cdk.Duration.hours(1),
        //   methodOptions: {
        //     "/chain/GET": {
        //       cachingEnabled: true,
        //       cacheTtl: cdk.Duration.hours(24)
        //     }
        //   }
        },
        // 👇 set up CORS
        defaultCorsPreflightOptions: {
            allowHeaders: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
            ],
            allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowCredentials: true,
            allowOrigins: apigateway.Cors.ALL_ORIGINS,
        }
    });

    // const bucket = new s3.Bucket(this, "NFTStore");

    // const handler = new lambda.Function(this, "NFTHandler", {
    //   runtime: lambda.Runtime.NODEJS_16_X,
    //   code: lambda.Code.fromAsset("resources"),
    //   handler: "nft/handler.main",
    //   timeout: cdk.Duration.seconds(20),
    //   environment: {
    //     BUCKET: bucket.bucketName
    //   }
    // });

    // bucket.grantReadWrite(handler);



    new route53.ARecord(this, "apiDNS", {
      zone: zone,
      recordName: "api",
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
    });

    // const nftIntegration = new apigateway.LambdaIntegration(handler, {
    //   requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    //   cacheKeyParameters: [
    //     'method.request.path.address', 
    //     'method.request.path.token_id',
    //   ],
    //   requestParameters: {
    //     'integration.request.path.address': 'method.request.path.address',
    //     'integration.request.path.token_id': 'method.request.path.token_id',
    //     'integration.request.querystring.owner_of': 'method.request.querystring.owner_of'
    //   },
    // });

    // const rootNft = api.root.addResource('nft');
    // const nftAddress = rootNft.addResource('{address}');
    // const nftToken = nftAddress.addResource('{token_id}');
    // nftToken.addMethod('GET', nftIntegration, {
    //   requestParameters: {
    //     'method.request.path.address': true,
    //     'method.request.path.token_id': true,
    //     'method.request.querystring.owner_of': false,
    //   },
    //   apiKeyRequired: true
    // });
    return api;
  }
}

module.exports = { APIService }