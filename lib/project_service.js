const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const {AttributeType, Table} = require("aws-cdk-lib/aws-dynamodb");
const {Policy, PolicyStatement} = require("aws-cdk-lib/aws-iam");

class ProjectService extends Construct {
  constructor(scope, id, api, bucket) {
    super(scope, id);

    const handler = new lambda.Function(this, "ProjectHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "project/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    const customerTable = new Table(this, `Project-Table`, {
      tableName: 'Projects',
      partitionKey: {
          name: 'id',
          type: AttributeType.STRING
      },
    });

    //Required permissions for Lambda function to interact with Customer table
    const customerTablePermissionPolicy = new PolicyStatement({
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
        resources: [customerTable.tableArn]
    });
  
    //Attaching an inline policy to the role
    handler.role?.attachInlinePolicy(
        new Policy(this, `Dappify-ProjectTablePermissions`, {
            statements: [customerTablePermissionPolicy],
        }),
    );

    bucket.grantReadWrite(handler);

    const root = api.root.addResource('project');
    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    const project = root.addResource("{id}");
    project.addMethod("POST", integration);   // POST /{id}
    project.addMethod("GET", integration);    // GET /{id}
    project.addMethod("DELETE", integration); // DELETE /{id}

  }
}

module.exports = { ProjectService }