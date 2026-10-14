import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"], theme: { extend: { colors: { hana: {DEFAULT:"#008d67",light:"#eaf8f1",dark:"#075c46"} } } }, plugins: [] };
export default config;
