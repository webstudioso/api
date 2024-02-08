const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient , GetCommand, DeleteCommand, UpdateCommand, ScanCommand
  } = require('@aws-sdk/lib-dynamodb');
const { Magic } = require('@magic-sdk/admin');
const { gzipSync, gunzipSync } = require('zlib');
const { getDIDTokenFromEvent } = require('../utils/auth');
const mAdmin = new Magic(process.env.MAGIC);

const dbClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dbClient);

exports.main = async (event, context) => {
    const TABLE= 'Templates'
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

            case "GET /template":
                const params = event?.queryStringParameters
                const expressions = []
                // Supported query params
                const status = params?.status
                if (status) expressions.push('s = :s')
                const author = params?.author
                if (author) expressions.push('o = :o')
                const isPrivate = params?.private
                if (isPrivate) expressions.push('v = :v')
                
                const filterExpression = expressions?.join(' and ')
                const filterValues = {
                    ...(status && {':s': status}),
                    ...(isPrivate && {':v': isPrivate.toLowerCase() === 'true'}),
                    ...(author && {':o': author}),
                }

                console.log(`Request to retrive templates with status:${status}, author:${author} and private=${isPrivate} creating filterExpresion:${filterExpression} and filterValues:${JSON.stringify(filterValues)}`);

                const response = await db.send(new ScanCommand({ 
                    TableName: TABLE,
                    ...( filterExpression && { 
                        FilterExpression : filterExpression
                    }),
                    ...( filterExpression && { 
                        ExpressionAttributeValues: filterValues
                    }),
                }));
                body = response?.Items?.map((item) => {
                    return {
                        id: item.i,
                        preview: item.p,
                        name: item.n,
                        description: item.d,
                        tags: item.x,
                        owner: item.o,
                        status: item.s,
                        updated: item.t,
                        isPrivate: item.v,
                        demo: item.l,
                        documentation: item.m
                    }
                });
                break;
            case "GET /template/{id}":
                const item = await db.send(new GetCommand({ TableName: TABLE, Key: { i: event.pathParameters.id }}));
                body = item?.Item ? {
                    id: item.Item.i,
                    preview: item.Item.p,
                    name: item.Item.n,
                    description: item.Item.d,
                    tags: item.Item.x,
                    owner: item.Item.o,
                    status: item.Item.s,
                    updated: item.Item.t,
                    isPrivate: item.Item.v,
                    demo: item.Item.l,
                    documentation: item.Item.m,
                    content: gunzipSync(item.Item.c).toString()
                } : { };
                break;
            case "POST /template/{id}":
                let bodyJSON = JSON.parse(event.body);
                const userMetadata = await mAdmin.users.getMetadataByIssuer(issuer)
                await db
                    .send(new UpdateCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set p = :p, n = :n, d = :d, t = :t, c = :c, o = :o, x = :x, s = :s, e = :e, v = :v, l = :l, m = :m",
                        ConditionExpression: "attribute_not_exists(i) OR o = :o",
                        ExpressionAttributeValues: {
                            ":p": bodyJSON.preview,
                            ":n": bodyJSON.name,
                            ":d": bodyJSON.description,
                            ":x": bodyJSON.tags,
                            ":c": gzipSync(bodyJSON.content),
                            ":o": issuer,
                            ":t": Date.now(),
                            ":s": "review",
                            ":e": userMetadata?.email,
                            ":v": bodyJSON.isPrivate,
                            ":l": bodyJSON.demo,
                            ":m": bodyJSON.documentation
                        }
                    }));
                body = `Update item ${event.pathParameters.id}`;
                break;
            case "DELETE /template/{id}":
                await db
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