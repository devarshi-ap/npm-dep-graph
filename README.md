<div align="center">
    <h2>NPM Dependency Graph</h2>
    <p>A tool to visualize NPM package dependency chains</p>
    <img src="https://howardzuo.gallerycdn.vsassets.io/extensions/howardzuo/vscode-npm-dependency/1.2.2/1544605671792/Microsoft.VisualStudio.Services.Icons.Default" height=100>
    <div>
        <a href="https://github.com/devarshi-ap/npm-dep-graph/actions?query=workflow:%22Project CI%22">
            <img src="https://github.com/devarshi-ap/npm-dep-graph/workflows/Project%20CI/badge.svg" alt="Run Test">
        </a>
        <p align="center">
            <a href="#key-features">Key Features</a> •
            <a href="#usage">Usage</a> •
            <a href="#tech-specs">Tech Specs</a>
        </p>
    </div>
</div>

https://github.com/user-attachments/assets/54d0641e-4319-478e-a0ed-29367366863a

## ✨ Key Features

-   **Interactive Dependency Graph**: Visualize NPM package dependencies with a zoomable + draggable force-directed graph.

-   **Package Search & Version Selection**: Search NPM packages and select versions, fetching up-to-date data from the NPM registry.

-   **Highlighting Key Information**:

    -   **Root Node**: Easily identifiable w/ a green background.
    -   **Deprecated Packages**: Indicated with red text for quick identification.

-   **Error Handling**: Clear messages for missing packages or empty graphs.

-   **Efficient API Calls**: Minimized API calls using debounce for smooth search and version selection.

-   **Server-side Graph Building**: Graphs are built by an AWS Lambda function that resolves semver ranges exactly like npm does and caches every resolved package in DynamoDB, so repeat lookups skip the registry entirely. Each graph shows how long it took and how many cache hits / registry fetches it needed.

-   **Responsive UI**: Intuitive and accessible design, optimized for both desktop and mobile.

## 🚀 Technologies Used

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
    <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js"/>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
    <img src="https://img.shields.io/badge/Force%20Graph-D3-FF6F00?style=for-the-badge&logo=d3.js&logoColor=white" alt="Force Graph"/>
    <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios"/>
    <img src="https://img.shields.io/badge/Lodash-E9A7B2?style=for-the-badge&logo=lodash&logoColor=black" alt="Lodash"/>
    <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="AWS"/>
</div>

-   **Vue.js**: For building an interactive user interface.
-   **TypeScript**: To ensure type safety and cleaner code.
-   **Vite**: Fast build tool for modern web apps.
-   **Force-Graph**: Renders the interactive graph using D3.js' force-directed layout.
-   **Axios**: Used to fetch package data from the NPM registry.
-   **Lodash Debounce**: Helps to throttle user input, reducing # API calls.
-   **AWS Lambda + API Gateway**: Builds dependency graphs server-side, using the official `semver` package for range resolution.
-   **Amazon DynamoDB**: Caches resolved packages (with TTLs) so large graphs are served without hundreds of registry calls.
-   **Amazon S3 + CloudFront**: Hosts the frontend; CloudFront also routes `/api/*` to the backend.
-   **AWS CDK (TypeScript)**: Defines all of the above as code, in `infra/`.

## 🏗️ Architecture

```
                         ┌─ /*      → S3 bucket (built Vue app, private, via Origin Access Control)
Browser → CloudFront ────┤
                         └─ /api/*  → API Gateway (HTTP API) → Lambda ──→ DynamoDB (cache)
                                                                  └──→ registry.npmjs.org (cache misses)
```

The Lambda (`server/src/graph.ts`) walks the dependency tree one level at a time. For each level it:

1. resolves every `name@range` to an exact version (cached for 6h, since new publishes change the answer),
2. loads each new `name@version`'s dependencies (cached for 7 days, since published versions are immutable),
3. batch-reads the cache first, fetches only the misses from the registry (16 at a time), and writes them back.

| Path | What's in it |
| --- | --- |
| `src/` | Vue frontend. `services/graphApi.ts` calls the API, or falls back to building in the browser if no API is configured. |
| `server/` | Lambda handler, graph builder, DynamoDB cache, local dev server and benchmark script. |
| `infra/` | CDK app defining DynamoDB, Lambda, API Gateway, S3, CloudFront and the GitHub OIDC deploy role. |

### 📈 Performance

Measured against the deployed stack (AWS `us-east-1`) with `npm run bench`, building the graph for `webpack@5.94.0` (80 packages):

| | Server time | End-to-end | Registry fetches | Cache hits |
| --- | ---: | ---: | ---: | ---: |
| Cold (cache empty) | 2,531 ms | 3,429 ms | 74 | 2 / 153 |
| Cached (DynamoDB) | **80 ms** | **158 ms** | **0** | 153 / 153 |

That's **~32× faster** server-side (~22× end to end) once a graph's packages are cached, with zero calls to the npm registry.

## 💻 Developer Setup

```bash
# 1. Clone the repo
git clone https://github.com/devarshi-ap/npm-dep-graph.git
cd npm-dep-graph

# 2. Install dependencies
npm i

# 3. Whip up dev server (graphs are built in the browser)
npm run dev

# 🧪 Run Jest.js tests (found in /tests)
npm run test
```

To run with the backend locally (no AWS account needed; it uses an in-memory cache instead of DynamoDB):

```bash
# terminal 1: the Lambda handler behind a local HTTP server on :3001
cd server && npm i && npm run dev

# terminal 2: the frontend, proxying /api to :3001
VITE_API_URL=/api npm run dev

# backend tests
cd server && npm test
```

To run the local frontend against a deployed stack instead: `VITE_API_URL=/api API_PROXY_TARGET=https://<your-id>.cloudfront.net npm run dev`.

## 🔄 CI/CD

-   The GH workflow ('Project CI') for this project comprises 2 jobs:
    1. `Run-Test` - installs deps, runs frontend + backend tests, builds the frontend and synthesizes the CDK stack (runs on every PR)
    2. `Deploy-Production` - runs on pushes to `main` after Run-Test passes. It authenticates to AWS through **GitHub OIDC** (no AWS keys stored in GitHub), runs `cdk deploy` for the backend, uploads the frontend with `aws s3 sync` and invalidates CloudFront.
-   See the below workflow badge to monitor the latest completion status.

### ☁️ Deploying to AWS (one-time setup)

The deploy role that CI uses is created by the stack itself, so the first deploy is done from your machine:

```bash
# 0. Install the AWS CLI and sign in (aws configure, or aws sso login)
# 1. Install deps
cd server && npm ci && cd ../infra && npm ci

# 2. Prepare the account/region for CDK (once per account + region)
npx cdk bootstrap

# 3. Deploy. If your account already has a GitHub OIDC provider, add: -c createGithubOidcProvider=false
npx cdk deploy
```

Then in GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | the `GithubDeployRoleArn` output from `cdk deploy` |
| `AWS_REGION` | the region you deployed to, e.g. `us-east-1` |

From then on every push to `main` deploys automatically (the deploy job is skipped until `AWS_DEPLOY_ROLE_ARN` is set). The site is at the `SiteUrl` output. To measure the cache:

```bash
cd server && npm run bench -- https://<your-id>.cloudfront.net/api webpack 5.94.0
```

Everything is pay-per-use (Lambda, on-demand DynamoDB, CloudFront), and the API is throttled to 10 req/s, so hobby traffic should cost very little. Setting an [AWS Budget](https://console.aws.amazon.com/billing/home#/budgets) alert is still a good idea. `npx cdk destroy` removes everything.

<a href="https://github.com/devarshi-ap/npm-dep-graph/actions?query=workflow:%22Project CI%22">
            <img src="https://github.com/devarshi-ap/npm-dep-graph/workflows/Project%20CI/badge.svg" alt="Run Test">
        </a>
        
<br>
<hr>

> #### ⚠️ Project Limitations
>
> While this project delivers on its functionality, there are some limitations to consider:
>
> -   **Large Dependency Graphs**: Cold lookups of large graphs still take a few seconds (one registry fetch per unique package), though cached lookups are near-instant. Graphs are capped at 1,500 packages, and big graphs are still visually cluttered.
> -   **Deduplicated Graph, Not an Install Tree**: Each range resolves the way npm picks a version (the `latest` tag if it satisfies the range, else the highest match), but the graph doesn't model npm's `node_modules` hoisting/deduplication, peer or optional dependencies, or lockfiles.
> -   **Browser Fallback**: Without `VITE_API_URL`, graphs are built in the browser with the original simplified resolver (earliest matching version).

<div align=center>Made with 💛</div>
