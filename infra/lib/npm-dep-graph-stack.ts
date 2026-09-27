import * as path from 'node:path';
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnStage, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface NpmDepGraphStackProps extends StackProps {
    /** "owner/repo" allowed to deploy through GitHub Actions OIDC. */
    githubRepo: string;
    /** Branch whose workflow runs may assume the deploy role. */
    githubBranch: string;
    /**
     * An AWS account can only have one GitHub OIDC provider. Set this to false
     * (cdk.json or `-c createGithubOidcProvider=false`) if the account already has one.
     */
    createGithubOidcProvider: boolean;
}

const SERVER_DIR = path.join(__dirname, '..', '..', 'server');

export class NpmDepGraphStack extends Stack {
    constructor(scope: Construct, id: string, props: NpmDepGraphStackProps) {
        super(scope, id, props);

        // ---------------------------------------------------------------------
        // Cache: one item per resolved name@version or range. DynamoDB deletes
        // items once `expiresAt` (epoch seconds) has passed.
        // ---------------------------------------------------------------------
        const table = new dynamodb.Table(this, 'GraphCache', {
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: RemovalPolicy.DESTROY, // it's only a cache
        });

        // ---------------------------------------------------------------------
        // API: Lambda behind an HTTP API (cheaper and simpler than REST API).
        // NodejsFunction bundles server/src/handler.ts with esbuild.
        // ---------------------------------------------------------------------
        const graphFn = new NodejsFunction(this, 'GraphFunction', {
            entry: path.join(SERVER_DIR, 'src', 'handler.ts'),
            projectRoot: SERVER_DIR,
            depsLockFilePath: path.join(SERVER_DIR, 'package-lock.json'),
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 1024, // also buys CPU/network, which matters for many parallel fetches
            timeout: Duration.seconds(29), // API Gateway's integration limit is 30s
            environment: { TABLE_NAME: table.tableName },
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'], // provided by the Lambda runtime
            },
            logGroup: new logs.LogGroup(this, 'GraphFunctionLogs', {
                retention: logs.RetentionDays.ONE_MONTH,
                removalPolicy: RemovalPolicy.DESTROY,
            }),
        });
        table.grantReadWriteData(graphFn);

        const api = new HttpApi(this, 'GraphApi');
        api.addRoutes({
            path: '/api/graph',
            methods: [HttpMethod.GET],
            integration: new HttpLambdaIntegration('GraphIntegration', graphFn),
        });
        // Throttle the public endpoint so a stray script can't run up the bill.
        (api.defaultStage!.node.defaultChild as CfnStage).defaultRouteSettings = {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
        };

        // ---------------------------------------------------------------------
        // Hosting: private S3 bucket, read by CloudFront via Origin Access Control.
        // /api/* is routed to the HTTP API so the frontend and API share an origin
        // (no CORS, and the frontend never needs to know the API's URL).
        // ---------------------------------------------------------------------
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        const apiDomain = Fn.select(2, Fn.split('/', api.apiEndpoint)); // https://<id>.execute-api.<region>.amazonaws.com
        const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress: true,
            },
            additionalBehaviors: {
                '/api/*': {
                    origin: new origins.HttpOrigin(apiDomain),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    // Don't cache at the edge, so the DynamoDB cache (and its timing
                    // stats) is what you measure. Forward the query string, not Host.
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                },
            },
            // With OAC and no s3:ListBucket, S3 returns 403 for missing keys.
            // Serve index.html instead so client-side routes still load.
            errorResponses: [{ httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.seconds(0) }],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        });

        // ---------------------------------------------------------------------
        // CI/CD: GitHub Actions assumes this role through OIDC, so no AWS keys are
        // stored in GitHub. Only workflow runs on the configured branch qualify.
        // ---------------------------------------------------------------------
        const githubOidcHost = 'token.actions.githubusercontent.com';
        const oidcProvider = props.createGithubOidcProvider
            ? new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
                  url: `https://${githubOidcHost}`,
                  clientIds: ['sts.amazonaws.com'],
              })
            : iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
                  this,
                  'GithubOidcProvider',
                  `arn:aws:iam::${this.account}:oidc-provider/${githubOidcHost}`,
              );

        const deployRole = new iam.Role(this, 'GithubDeployRole', {
            description: `Assumed by GitHub Actions in ${props.githubRepo} (${props.githubBranch}) to deploy npm-dep-graph`,
            assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
                StringEquals: {
                    [`${githubOidcHost}:aud`]: 'sts.amazonaws.com',
                    [`${githubOidcHost}:sub`]: `repo:${props.githubRepo}:ref:refs/heads/${props.githubBranch}`,
                },
            }),
            maxSessionDuration: Duration.hours(1),
        });
        // Upload the built site and invalidate the CDN.
        siteBucket.grantReadWrite(deployRole);
        siteBucket.grantDelete(deployRole);
        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['cloudfront:CreateInvalidation'],
                resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
            }),
        );
        // `cdk deploy` works by assuming the roles created by `cdk bootstrap`.
        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['sts:AssumeRole'],
                resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
            }),
        );

        // ---------------------------------------------------------------------
        // Outputs, read by the deploy workflow (and handy for you).
        // ---------------------------------------------------------------------
        new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
        new CfnOutput(this, 'ApiUrl', { value: `https://${distribution.distributionDomainName}/api` });
        new CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
        new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
        new CfnOutput(this, 'GithubDeployRoleArn', { value: deployRole.roleArn });
        new CfnOutput(this, 'CacheTableName', { value: table.tableName });
    }
}
