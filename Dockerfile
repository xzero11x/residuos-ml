ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE}
USER root
WORKDIR /app
COPY .vercel/output/static ./site
COPY server/index.mjs ./server/index.mjs
RUN mkdir -p /data && chown node:node /data
USER node
ENV PORT=4322 DATA_DIR=/data
EXPOSE 4322
CMD ["node", "server/index.mjs"]
