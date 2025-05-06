FROM denoland/deno:alpine-2.0.2

WORKDIR /app

# Cache and install dependencies
COPY deno* .
RUN deno install

# Copy the rest of the application files
COPY . .

# Expose the application port (adjust as per your app)
EXPOSE 3005

# Set the entrypoint for Deno to run the app
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "src/main.ts"]
