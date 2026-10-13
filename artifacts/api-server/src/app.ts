import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./lib/studio";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(cors({ credentials: true, origin: false }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.path!=="/api/healthz") res.setHeader("Cache-Control","no-store");
  // Same-origin JSON mutations, including requests from the preview iframe.
  if(!["GET","HEAD","OPTIONS"].includes(req.method)){
    const origin=req.headers.origin;
    const host=req.headers["x-forwarded-host"]||req.headers.host;
    if(origin && new URL(origin).host!==host){res.status(403).json({error:"Cross-origin request rejected."});return;}
  }
  next();
});
app.use(authMiddleware);

app.use("/api", router);
app.use(errorHandler);

export default app;
