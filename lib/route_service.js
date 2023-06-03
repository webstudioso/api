const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const { AttributeType, Table, BillingMode } = require("aws-cdk-lib/aws-dynamodb");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class RouteService extends Construct {
  constructor(scope, id, api, bucket, authorizer, secret, key) {
    super(scope, id);

    const handler = new lambda.Function(this, "RouteHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "route/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName,
        MAGIC: secret.secretValueFromJson(key).unsafeUnwrap(),
        AWS_CF_DISTRIBUTION_ID: process.env.AWS_CF_DISTRIBUTION_ID
      }
    });

    const routeTable = new Table(this, `Route-Table`, {
      tableName: 'Routes',
      partitionKey: {
          name: 'i',
          type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    const gsi = routeTable.addGlobalSecondaryIndex({
      indexName: 'OwnerIndex',
      partitionKey: {name: 'o', type: AttributeType.STRING},
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    const routeTablePermissionPolicy = new PolicyStatement({
        actions: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:Query",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
        ],
        resources: [routeTable.tableArn, `${routeTable.tableArn}/index/*`]
    });
  
    const cfInvalidationPermissionPolicy = new PolicyStatement({
      actions: [
          "cloudfront:CreateInvalidation"
      ],
      resources: [`arn:aws:cloudfront::${process.env.AWS_ACCOUNT}:distribution/${process.env.AWS_CF_DISTRIBUTION_ID}`]
    });

    handler.role?.attachInlinePolicy(
        new Policy(this, `Webstudio-RoutePermissions`, {
            statements: [routeTablePermissionPolicy, cfInvalidationPermissionPolicy],
        })
    );

    bucket.grantReadWrite(handler);

    const root = api.root.addResource('route');
    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    const route = root.addResource("{id}");
    route.addMethod("POST", integration, { authorizer });   // POST /{id}
    route.addMethod("GET", integration);    // GET /{id}
    route.addMethod("DELETE", integration, { authorizer }); // DELETE /{id}
  }
}

module.exports = { RouteService }