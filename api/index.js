// The application is compiled by `npm run build` before Vercel packages this
// JavaScript serverless function. Keeping this wrapper in JavaScript avoids a
// second, platform-specific TypeScript compilation pass.
export { default } from "../dist/server.js";
