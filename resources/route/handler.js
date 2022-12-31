const AWS = require("aws-sdk");
const { Magic } = require('@magic-sdk/admin');
const mAdmin = new Magic(process.env.MAGIC);

const routeDB = new AWS.DynamoDB.DocumentClient();

const getIssuer = (event) => {
    // Get issuer
    const DIDToken = event.headers.authorizetoken.substring(7);
    const issuer = mAdmin.token.getIssuer(DIDToken);
    console.log(`User ${issuer} request received`);
    return issuer;    
}

exports.main = async (event, context) => {
    const TABLE= 'Routes'
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers" : "Origin,X-Requested-With,Content-Type,Accept",
        "Access-Control-Allow-Origin": event?.headers?.Referer?.replace(/\/$/,''),
        "Access-Control-Allow-Credentials": true
    };

    console.log(JSON.stringify(event));
    let path = event.resource;
    let httpMethod = event.httpMethod;
    let route = httpMethod.concat(' ').concat(path);

    try {
        switch (route) {
            case "GET /route/{id}":
                const data = await routeDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        }
                    })
                    .promise();
                body = data?.Item ? {
                    id: data.Item.i,
                    cid: data.Item.c
                }: {};
                break;
            case "POST /route/{id}":
                let requestJSON = JSON.parse(event.body);
                await routeDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c, o = :o",
                        ConditionExpression: "attribute_not_exists(i) OR o = :o",
                        ExpressionAttributeValues: {
                            ":c": requestJSON.cid,
                            ":o": getIssuer(event)
                        }
                    })
                    .promise();
                body = `Post item ${requestJSON.id}`;
                break;
            case "DELETE /route/{id}":
                await routeDB
                    .delete({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": getIssuer(event)
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                break;

            default:
                throw new Error(`Unsupported route: "${route}"`);
        }
    } catch (err) {
        console.log(err)
        statusCode = 400;
        body = err.message;
    } finally {
        console.log(body)
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};