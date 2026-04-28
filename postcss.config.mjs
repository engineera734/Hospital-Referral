import { config } from "node:process";
import { plugins } from "./postcss.config";

const Config={
    plugins:{
        "@tailwindcss/postcss":{},
    },
};
export default config ;

