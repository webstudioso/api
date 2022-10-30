const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");

class NFTService extends Construct {
  constructor(scope, id) {
    super(scope, id);

    const rootDomain = process.env.ROOT_DOMAIN;
    const zone = route53.HostedZone.fromLookup(this, "baseZone", {
      domainName: rootDomain,
    });
  
    const bucket = new s3.Bucket(this, "NFTStore");

    const handler = new lambda.Function(this, "NFTHandler", {
      runtime: lambda.Runtime.NODEJS_16_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("resources"),
      handler: "nft.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler); // was: handler.role);

    const api = new apigateway.RestApi(this, "nft-api", {
      restApiName: "NFT Service",
      description: "This service serves nft.",
      domainName: {
        domainName: `api.${rootDomain}`,
        certificate: acm.Certificate.fromCertificateArn(
          this,
          "api-cert",
          process.env.ACM_ARN
        ),
        endpointType: apigateway.EndpointType.REGIONAL,
      },
    });

    new route53.ARecord(this, "apiDNS", {
      zone: zone,
      recordName: "api",
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
    });

    const nftIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    // api.root.addMethod("GET", nftIntegration); // GET /

    const rootNft = api.root.addResource('nft');
    const nftAddress = rootNft.addResource('{address}');
    const nftToken = nftAddress.addResource('{token_id}');
    nftToken.addMethod('GET', nftIntegration);
  }
}

module.exports = { NFTService }