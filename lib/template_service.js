const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const { AttributeType, Table, BillingMode } = require("aws-cdk-lib/aws-dynamodb");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class TemplateService extends Construct {
  constructor(scope, id, api, bucket, authorizer, secret, key) {
    super(scope, id);

    const handler = new lambda.Function(this, "TemplateHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "template/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName,
        MAGIC: secret.secretValueFromJson(key).unsafeUnwrap()
      }
    });

    const table = new Table(this, `Template-Table`, {
      tableName: 'Templates',
      partitionKey: {
          name: 'i',
          type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    table.addGlobalSecondaryIndex({
      indexName: 'OwnerIndex',
      partitionKey: {name: 'o', type: AttributeType.STRING},
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    //Required permissions for Lambda function to interact with Customer table
    const tablePermissionPolicy = new PolicyStatement({
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
        resources: [table.tableArn,`${table.tableArn}/index/*`]
    });
  
    //Attaching an inline policy to the role
    handler.role?.attachInlinePolicy(
        new Policy(this, `Webstudio-TemplateTablePermissions`, {
            statements: [tablePermissionPolicy],
        }),
    );

    bucket.grantReadWrite(handler);

    const root = api.root.addResource('template');

    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    root.addMethod("GET", integration, { authorizer });

    // Update template, get template, delete
    const template = root.addResource("{id}");
    template.addMethod("POST", integration, { authorizer });
    template.addMethod("GET", integration, { authorizer });
    template.addMethod("DELETE", integration, { authorizer });
  }
}

module.exports = { TemplateService }