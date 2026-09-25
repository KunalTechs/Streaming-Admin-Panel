import "dotenv/config";

const PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";

export const VIDEO_INDEX = `${PREFIX}_videos`;
export const CATEGORY_INDEX = `${PREFIX}_categories`;
