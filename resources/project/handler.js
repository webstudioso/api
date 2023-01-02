const AWS = require("aws-sdk");
const { Magic } = require('@magic-sdk/admin');
const mAdmin = new Magic(process.env.MAGIC);

const projectDB = new AWS.DynamoDB.DocumentClient();

exports.main = async (event, context) => {
    const TABLE= 'Projects'
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

    // Get issuer
    const DIDToken = event.headers.authorizetoken.substring(7);
    const issuer = mAdmin.token.getIssuer(DIDToken);
    console.log(`User ${issuer} request received`);

    try {
        switch (route) {

            case "GET /project":
                const response = await projectDB
                    .query({
                        TableName: TABLE,
                        IndexName: "OwnerIndex",
                        KeyConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    })
                    .promise();
                body = response?.Items?.map((item) => {
                    return {
                        id: item.i,
                        subdomain: item.s,
                        domain: item.d,
                        metadata: item.m,
                        plan: item.p,
                        name: item.n
                    }
                });
                break;
            case "GET /project/{id}":
                const item = await projectDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    })
                    .promise();
                body = item ? {
                    id: item.Item.i,
                    subdomain: item.Item.s,
                    domain: item.Item.d,
                    metadata: item.Item.m,
                    plan: item.Item.p,
                    name: item.Item.n
                } : { };
                break;
            case "POST /project/{id}":
                let bodyJSON = JSON.parse(event.body);
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set s = :s, d = :d, p = :p, n = :n, o = :o",
                        ConditionExpression: "attribute_not_exists(i) OR o = :o",
                        ExpressionAttributeValues: {
                            ":s": bodyJSON.subdomain,
                            ":d": bodyJSON.domain,
                            ":p": bodyJSON.plan,
                            ":n": bodyJSON.name,
                            ":o": issuer
                        }
                    })
                    .promise();
                body = `Update item ${event.pathParameters.id}`;
                break;
            case "DELETE /project/{id}":
                await projectDB
                    .delete({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                break;

            case "GET /project/{id}/content":
                const data = await projectDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    })
                    .promise();
                body = data?.Item?.c;
                break;
            case "POST /project/{id}/content":
                let requestJSON = JSON.parse(event.body);
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":c": requestJSON,
                            ":o": issuer
                        }
                    })
                    .promise();
                body = `Updated project content ${requestJSON.id}`;
                break;
            case "DELETE /project/{id}/content":
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":c": null,
                            ":o": issuer
                        }
                    })
                    .promise();
                body = `Deleted project content ${event.pathParameters.id}`;
                break;
            case "POST /project/{id}/metadata":
                    let metaJSON = JSON.parse(event.body);
                    await projectDB
                        .update({
                            TableName: TABLE,
                            Key: {
                                i: event.pathParameters.id
                            },
                            UpdateExpression: "set m = :m",
                            ConditionExpression: "o = :o",
                            ExpressionAttributeValues: {
                                ":m": metaJSON,
                                ":o": issuer
                            }
                        })
                        .promise();
                    body = `Updated project metadata ${event.pathParameters.id}`;
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