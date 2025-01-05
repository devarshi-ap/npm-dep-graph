<div align="center">
    <h2>NPM Dependency Graph</h2>
    <p>A tool to visualize NPM package dependency chains</p>
    <img src="https://howardzuo.gallerycdn.vsassets.io/extensions/howardzuo/vscode-npm-dependency/1.2.2/1544605671792/Microsoft.VisualStudio.Services.Icons.Default" height=100>
    <div>
        <a href="https://github.com/devarshi-ap/npm-dep-graph/actions?query=workflow:%22Project CI%22">
            <img src="https://github.com/devarshi-ap/npm-dep-graph/workflows/Project%20CI/badge.svg" alt="Run Test">
        </a>
        <a href="#license">
            <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
        </a>
        <p align="center">
            <a href="#key-features">Key Features</a> •
            <a href="#usage">Usage</a> •
            <a href="#tech-specs">Tech Specs</a>
        </p>
    </div>
    <hr>
</div>

## ✨ Key Features

-   **Interactive Dependency Graph**: Visualize NPM package dependencies with a zoomable + draggable force-directed graph.

-   **Package Search & Version Selection**: Search NPM packages and select versions, fetching up-to-date data from the NPM registry.

-   **Highlighting Key Information**:

    -   **Root Node**: Easily identifiable with a green background.
    -   **Deprecated Packages**: Indicated with red text for quick identification.

-   **Error Handling**: Clear messages for missing packages or empty graphs.

-   **Efficient API Calls**: Minimized API calls using debounce for smooth search and version selection.

-   **Responsive UI**: Intuitive and accessible design, optimized for both desktop and mobile.

## 🌍 Demo

Take a look at the live demo and see it in action:

[Demo Link - View the Dependency Graph](#)

## 🚀 Technologies Used

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
    <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js"/>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
    <img src="https://img.shields.io/badge/Force%20Graph-D3-FF6F00?style=for-the-badge&logo=d3.js&logoColor=white" alt="Force Graph"/>
    <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios"/>
    <img src="https://img.shields.io/badge/Lodash-E9A7B2?style=for-the-badge&logo=lodash&logoColor=black" alt="Lodash"/>
</div>

-   **Vue.js**: For building an interactive user interface.
-   **TypeScript**: To ensure type safety and cleaner code.
-   **Vite**: Fast build tool for modern web apps.
-   **Force-Graph**: Renders the interactive graph using D3.js' force-directed layout.
-   **Axios**: Used to fetch package data from the NPM registry.
-   **Lodash Debounce**: Helps to throttle user input, reducing # API calls.

## 💻 Developer Setup

```bash
# 1. Clone the repo
git clone https://github.com/devarshi-ap/npm-dep-graph.git
cd npm-dep-graph

# 2. Install dependencies
npm i

# 3. Whip up dev server
npm run dev

# 🧪 Run Jest.js tests (found in /src/tests)
npm run test
```

## 🔄 CI/CD

-   The GH workflow ('Project CI') for this project is straightforward, comprising of 2 jobs:
    1. `Run-Test` - basic env setup + dep install + run test
    2. `Deploy-Production` - runs strictly upon successful completion of Run-Test; creates production build + deploys using Vercel's CLI
-   See the below workflow badge to monitor the latest completion status.

<a href="https://github.com/devarshi-ap/npm-dep-graph/actions?query=workflow:%22Project CI%22">
            <img src="https://github.com/devarshi-ap/npm-dep-graph/workflows/Project%20CI/badge.svg" alt="Run Test">
        </a>
<hr>
<div align=center>Made with 💛</div>