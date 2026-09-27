export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'], // server/ and infra/ run their own tests
    testMatch: ['**/*.test.ts'], // Match test files with a .test.ts extension
};
