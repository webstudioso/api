const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient , GetCommand, DeleteCommand, QueryCommand, UpdateCommand,
  } = require('@aws-sdk/lib-dynamodb');
const { Magic } = require('@magic-sdk/admin');
const { gzipSync, gunzipSync } = require('zlib');
const { getDIDTokenFromEvent } = require('../utils/auth');
const mAdmin = new Magic(process.env.MAGIC);

const projectDBClient = new DynamoDBClient({});
const projectDB = DynamoDBDocumentClient.from(projectDBClient);

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
    const DIDToken = getDIDTokenFromEvent(event);
    const issuer = mAdmin.token.getIssuer(DIDToken);
    console.log(`User ${issuer}`);

    try {
        switch (route) {

            case "GET /project":
                const response = await projectDB
                    .send(new QueryCommand({
                        TableName: TABLE,
                        IndexName: "OwnerIndex",
                        KeyConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    }));
                body = response?.Items?.map((item) => {
                    return {
                        id: item.i,
                        subdomain: item.s,
                        domain: item.d,
                        metadata: item.m,
                        plan: item.p,
                        name: item.n,
                        owner: item.o,
                        collaborators: item.u
                    }
                });
                break;
            case "GET /project/{id}":
                const item = await projectDB
                    .send(new GetCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o OR contains(u, :o)",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    }));
                body = item?.Item ? {
                    id: item.Item.i,
                    subdomain: item.Item.s,
                    domain: item.Item.d,
                    metadata: item.Item.m,
                    plan: item.Item.p,
                    name: item.Item.n,
                    owner: item.Item.o,
                    collaborators: item.Item.u
                } : { };
                break;
            case "POST /project/{id}":
                let bodyJSON = JSON.parse(event.body);
                const userMetadata = await mAdmin.users.getMetadataByIssuer(issuer)
                await projectDB
                    .send(new UpdateCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set s = :s, d = :d, p = :p, n = :n, o = :o, u =:u, m = :m, e = :e",
                        ConditionExpression: "attribute_not_exists(i) OR o = :o",
                        ExpressionAttributeValues: {
                            ":s": bodyJSON.subdomain,
                            ":d": bodyJSON.domain,
                            ":p": bodyJSON.plan,
                            ":n": bodyJSON.name,
                            ":u": bodyJSON.collaborators,
                            ":m": bodyJSON.metadata,
                            ":o": issuer,
                            ":e": userMetadata?.email
                        }
                    }));
                body = `Update item ${event.pathParameters.id}`;
                break;
            case "DELETE /project/{id}":
                await projectDB
                    .send(new DeleteCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    }));
                body = `Deleted item ${event.pathParameters.id}`;
                break;

            case "GET /project/{id}/content":
                const data = await projectDB
                    .send(new GetCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o OR contains(u, :o)",
                        ExpressionAttributeValues: {
                            ":o": issuer
                        }
                    }));

                if (data?.Item?.c) {
                    // Content exist for this project, we try to decompress
                    let responsePayload = {}
                    try {
                        console.log(`Trying to decompress with zlib ${event.pathParameters.id} data`)
                        responsePayload = gunzipSync(data.Item.c).toString();
                    } catch (e) {
                        console.log(`Zlib decompression failed, record is stored pure. Return database unadultered data`)
                        responsePayload = data.Item.c
                    } finally {
                        console.log(`Parsing to JSON retrieved fields`)
                        body = JSON.parse(responsePayload)
                    }
                } else {
                    // No content yet for this project, return empty
                    body = {}
                }
                break;
            case "POST /project/{id}/content":
                // Compress payload
                const compressed = gzipSync(event.body);
                console.log(`Storing data for project ${event.pathParameters.id}`)
                console.log(compressed.toString('base64'))
                await projectDB
                    .send(new UpdateCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ConditionExpression: "o = :o OR contains(u, :o)",
                        ExpressionAttributeValues: {
                            ":c": compressed,
                            ":o": issuer
                        }
                    }));
                body = `Updated project content ${event.pathParameters.id}`;
                break;
            case "DELETE /project/{id}/content":
                await projectDB
                    .send(new UpdateCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ConditionExpression: "o = :o OR contains(u, :o)",
                        ExpressionAttributeValues: {
                            ":c": null,
                            ":o": issuer
                        }
                    }));
                body = `Deleted project content ${event.pathParameters.id}`;
                break;
            case "POST /project/{id}/metadata":
                    let metaJSON = JSON.parse(event.body);
                    await projectDB
                        .send(new UpdateCommand({
                            TableName: TABLE,
                            Key: {
                                i: event.pathParameters.id
                            },
                            UpdateExpression: "set m = :m",
                            ConditionExpression: "o = :o OR contains(u, :o)",
                            ExpressionAttributeValues: {
                                ":m": metaJSON,
                                ":o": issuer
                            }
                        }));
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