import { App } from 'aws-cdk-lib';
import { NpmDepGraphStack } from '../lib/npm-dep-graph-stack';

const app = new App();

new NpmDepGraphStack(app, 'NpmDepGraph', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    githubRepo: app.node.getContext('githubRepo'),
    githubBranch: app.node.getContext('githubBranch'),
    // Context passed on the command line (-c key=false) arrives as a string.
    createGithubOidcProvider: String(app.node.getContext('createGithubOidcProvider')) !== 'false',
});
